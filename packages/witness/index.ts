import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Usage {
	in: number; // Input Token
	out: number; // Output Token
	cw: number; // Cache Write
	cr: number; // Cache Read
	tok: number; // Total Tokens
	reason: number; // reasoning
	cst: number; // Total Cost
}

export interface Tool {
	name: string;
	isError: boolean;
	usage?: Usage;
}

interface Turn {
	ti: number; // Turn Index
	tools: Array<Tool>; // Tool Calls
	totalUsage: Usage; // Total Usage
}

export interface AgentTurnRecord {
	t: string; // Time
	sid: string; // Session Id
	sn: string; // Session Name
	h: string; // Harness
	mod: string; // Model
	turns: Turn[]; // Agent Turns
	skills?: string[]; // Raw skill names invoked during this session
	metadata?: object; // Other Agent Specific Data
	rep: string; // Repository (git remote URL or git root; cwd if not a repo)
	branch?: string; // Git branch at session start
	user?: { name: string; email: string }; // Git user config at session start
}

export class Session {
	public sessionName: string = "";
	public totalTokens: number = 0;
	public totalCost: number = 0;
	public readonly sessionId: string = "";

	private lastModel: string = "";
	private currentAgentTurn?: AgentTurnRecord;
	private metadata: Record<string, unknown> = {};
	private skills: string[] = [];
	private readonly harness: string = "";
	private readonly path: string;
	private readonly fileName: string;
	private readonly rep: string;
	private readonly branch: string;
	private readonly user: { name: string; email: string };

	constructor({
		sessionId,
		harness,
	}: {
		sessionId: string;
		harness: string;
	}) {
		this.sessionId = sessionId;
		this.harness = harness;

		const root = this.gitRoot();
		this.rep = this.gitRemote() ?? root;
		this.branch = this.gitBranch();
		this.user = this.gitUser();

		this.path = join(root, ".witness");
		this.fileName = "usage.jsonl";
		mkdirSync(this.path, { recursive: true });
		this.loadHistory();
	}

	private git(cmd: string): string {
		try {
			return execSync(cmd, {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim();
		} catch {
			return "";
		}
	}

	private gitRoot(): string {
		return this.git("git rev-parse --show-toplevel") || process.cwd();
	}

	private gitRemote(): string | undefined {
		return this.git("git config --get remote.origin.url") || undefined;
	}

	private gitBranch(): string {
		return this.git("git branch --show-current");
	}

	private gitUser(): { name: string; email: string } {
		const get = (key: string): string => this.git(`git config --get ${key}`);
		return { name: get("user.name"), email: get("user.email") };
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
			branch: this.branch,
			user: this.user,
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
