import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Session, type Tool, type Usage } from "witness";

const PORT = 4444;

export default function main(pi: ExtensionAPI) {
	let session: Session;
	let ctx: ExtensionContext;
	let server: Server | undefined;
	const fmt = new Intl.NumberFormat("en", { notation: "compact" });

	function toUsage(u?: {
		input?: number;
		output?: number;
		cacheWrite?: number;
		cacheRead?: number;
		totalTokens?: number;
		reasoning?: number;
		cost?: { total?: number };
	}): Usage {
		return {
			in: u?.input || 0,
			out: u?.output || 0,
			cw: u?.cacheWrite || 0,
			cr: u?.cacheRead || 0,
			tok: u?.totalTokens || 0,
			reason: u?.reasoning || 0,
			cst: u?.cost?.total || 0,
		};
	}

	function renderStatus(): void {
		ctx.ui.setStatus(
			"witness",
			ctx.ui.theme.fg(
				"dim",
				`💰 $${session.totalCost.toFixed(2)} · ${fmt.format(session.totalTokens)} tok (repo)`,
			),
		);
	}

	pi.on("session_start", (event, c) => {
		ctx = c;
		session = new Session({
			sessionId: ctx.sessionManager.getSessionId(),
			harness: "pi",
			perRepo: true,
			path: process.env.WITNESS_DIR ?? join(homedir(), ".pi", "witness"),
		});
		session.addMetadata({ start_reason: event.reason });
		renderStatus();
	});

	pi.on("input", (event) => {
		if (!event.text.startsWith("/skill:")) return;
		const name = event.text.slice(7).trim().split(/\s+/)[0];
		if (name) session.addSkill(name);
	});

	pi.on("tool_call", (event) => {
		if (event.toolName !== "read") return;
		const path: unknown = event.input.path;
		if (typeof path !== "string") return;
		if (path !== "SKILL.md" && !path.endsWith("/SKILL.md")) return;
		const dir = path === "SKILL.md" ? "" : path.slice(0, -"/SKILL.md".length);
		session.addSkill(dir.split("/").pop() || "skill:unknown");
	});

	pi.on("session_info_changed", async (event) => {
		session.sessionName = event.name ?? "";
	});

	pi.on("agent_start", async (_, c) => {
		let model: string = "";

		const mdl = c.model || ctx.model;
		if (mdl) {
			model = `${mdl.provider}/${mdl.name}`;
		}

		session.startAgent({ dateTimeISOString: new Date().toISOString(), model });
	});

	pi.on("turn_end", async (event) => {
		const tools: (Tool & { usage: Usage })[] = (event.toolResults ?? []).map(
			(t) => ({
				name: t.toolName,
				isError: t.isError,
				usage: toUsage(t.usage),
			}),
		);

		const assistantMsg =
			event.message && event.message.role === "assistant"
				? event.message
				: undefined;

		const usages = [toUsage(assistantMsg?.usage), ...tools.map((t) => t.usage)];

		session.addTurn({
			index: event.turnIndex,
			tools,
			totalUsage: usages.reduce(
				(acc, u) => ({
					in: acc.in + u.in,
					out: acc.out + u.out,
					cw: acc.cw + u.cw,
					cr: acc.cr + u.cr,
					tok: acc.tok + u.tok,
					reason: acc.reason + u.reason,
					cst: acc.cst + u.cst,
				}),
				{
					in: 0,
					out: 0,
					cw: 0,
					cr: 0,
					tok: 0,
					reason: 0,
					cst: 0,
				} satisfies Usage,
			),
		});

		renderStatus();
	});

	pi.on("agent_settled", async () => {
		session.flush();
		renderStatus();
	});

	pi.registerCommand("witness-pi:show", {
		description: "Show detailed usage data for this project",
		handler: async (_args, c) => {
			const dist = fileURLToPath(
				new URL("./dist", import.meta.resolve("local-web/package.json")),
			);

			if (!existsSync(join(dist, "index.html"))) {
				c.ui.notify("local-web not built — run `bun run build:web`", "error");
				return;
			}

			if (!server) {
				try {
					const MIME: Record<string, string> = {
						".html": "text/html; charset=utf-8",
						".js": "text/javascript",
						".css": "text/css",
						".json": "application/json",
						".svg": "image/svg+xml",
						".png": "image/png",
						".ico": "image/x-icon",
					};

					server = createServer((req, res) => {
						const { pathname } = new URL(req.url ?? "/", "http://localhost");
						if (pathname === "/api/records") {
							res.writeHead(200, { "content-type": MIME[".json"] });
							res.end(JSON.stringify(session?.readRecords() ?? []));
							return;
						}

						const rel = pathname === "/" ? "index.html" : pathname.slice(1);
						const file = join(dist, rel);

						if (!file.startsWith(`${dist}/`)) {
							res.writeHead(404).end("not found");
							return;
						}

						try {
							const body = readFileSync(file);
							res.writeHead(200, {
								"content-type":
									MIME[extname(file)] ?? "application/octet-stream",
							});
							res.end(body);
						} catch {
							res.writeHead(404).end("not found");
						}
					});

					await new Promise<void>((resolve, reject) => {
						server?.once("error", reject);
						server?.listen(PORT, "127.0.0.1", resolve);
					});
				} catch (e) {
					c.ui.notify(`witness: server failed — ${e}`, "error");
					return;
				}
			}

			if (process.platform === "darwin") {
				spawn("open", [`http://localhost:${PORT}`], { stdio: "ignore" });
			} else {
				c.ui.notify(`witness: http://localhost:${PORT}`, "info");
			}
			c.ui.notify(`witness: http://localhost:${PORT}`, "info");
		},
	});

	pi.on("session_shutdown", async () => {
		server?.closeAllConnections?.();
		server?.close();
		session.flush();
	});
}
