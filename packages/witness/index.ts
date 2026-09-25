import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentTurnRecord, Tool, Usage } from "../types";

export type { AgentTurnRecord, Tool, Usage };

export function repoDirName(rep: string): string {
	const cleaned = rep
		.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
		.replace(/^git@/, "")
		.replace(/\.git$/, "")
		.replace(/[/\\:]/g, "_");
	return cleaned || "repo";
}

export class Session {
	public readonly sessionId: string = "";
	public sessionName: string = "";

	private readonly harness: string = "";

	private currentAgentTurn?: AgentTurnRecord;

	private lastModel: string = "";

	private metadata: Record<string, unknown> = {};
	private skills: string[] = [];
	public totalTokens: number = 0;
	public totalCost: number = 0;
	private readonly path: string;
	private readonly fileName: string;
	private readonly rep: string;

	constructor({
		sessionId,
		harness,
		path,
		perRepo = false,
	}: {
		sessionId: string;
		harness: string;
		path?: string;
		perRepo?: boolean;
	}) {
		this.sessionId = sessionId;
		this.harness = harness;
		const root = this.gitRoot();
		this.rep = this.gitRemote() ?? root;
		const base = path ?? process.env.WITNESS_DIR ?? join(root, ".witness");
		this.path = perRepo ? join(base, repoDirName(this.rep)) : base;
		this.fileName = "usage.jsonl";
		mkdirSync(this.path, { recursive: true });
		this.loadHistory();
	}

	private gitRoot(): string {
		try {
			return execSync("git rev-parse --show-toplevel", {
				encoding: "utf8",
			}).trim();
		} catch {
			return process.cwd();
		}
	}

	private gitRemote(): string | undefined {
		try {
			const url = execSync("git config --get remote.origin.url", {
				encoding: "utf8",
			}).trim();
			return url || undefined;
		} catch {
			return undefined;
		}
	}

	public readRecords(): AgentTurnRecord[] {
		let content: string;
		try {
			content = readFileSync(join(this.path, this.fileName), "utf8");
		} catch {
			return [];
		}
		const records: AgentTurnRecord[] = [];
		for (const line of content.split("\n")) {
			if (!line.trim()) continue;
			try {
				const rec = JSON.parse(line);
				if (rec?.rep && rec.rep !== this.rep) continue;
				records.push(rec);
			} catch {
				// skip malformed line
			}
		}
		return records;
	}

	private loadHistory() {
		for (const rec of this.readRecords()) {
			for (const turn of rec.turns ?? []) {
				this.totalTokens += Number(turn.totalUsage?.tok) || 0;
				this.totalCost += Number(turn.totalUsage?.cst) || 0;
			}
		}
	}

	public addMetadata(data: Record<string, unknown>) {
		this.metadata = { ...this.metadata, ...data };
	}

	public startAgent({
		dateTimeISOString,
		model,
	}: {
		dateTimeISOString: string;
		model: string;
	}) {
		this.lastModel = model;
		this.currentAgentTurn = {
			t: dateTimeISOString,
			sid: this.sessionId,
			sn: this.sessionName,
			h: this.harness,
			mod: model,
			rep: this.rep,
			turns: [],
		};
	}

	public addSkill(name: string) {
		this.skills.push(name);
	}

	public addTurn({
		index,
		tools,
		totalUsage,
	}: {
		index?: number;
		tools: Tool[];
		totalUsage: Usage;
	}) {
		this.totalTokens += totalUsage.tok;
		this.totalCost += totalUsage.cst;

		// A retry/compaction turn can arrive after agent_settled already
		// flushed the burst. Never drop it: auto-start a record so every
		// attempt persists on disk.
		if (!this.currentAgentTurn) {
			this.startAgent({
				dateTimeISOString: new Date().toISOString(),
				model: this.lastModel,
			});
		}
		this.currentAgentTurn?.turns.push({ ti: index || 0, tools, totalUsage });
	}

	public flush() {
		if (!this.currentAgentTurn) return;

		this.currentAgentTurn.metadata = this.metadata;
		this.currentAgentTurn.skills = this.skills;
		this.currentAgentTurn.sn = this.sessionName;

		appendFileSync(
			join(this.path, this.fileName),
			`${JSON.stringify(this.currentAgentTurn)}\n`,
		);

		this.currentAgentTurn = undefined;
	}
}
