import type { AgentTurnRecord } from 'witness';

export const records = $state<{ data: AgentTurnRecord[]; loaded: boolean }>({
	data: [],
	loaded: false
});
