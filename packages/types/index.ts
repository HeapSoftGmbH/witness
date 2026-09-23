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
}
