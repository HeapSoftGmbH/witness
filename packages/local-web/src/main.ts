import { mount } from 'svelte';

import App from './App.svelte';

const app = mount(App, {
	target: document.querySelector<HTMLElement>('#app') ?? document.body
});

export default app;
