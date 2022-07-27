import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
	id: 'global-search',
	name: 'Global Search',
	icon: 'search',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
});
