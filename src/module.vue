<script lang="ts" setup>
import { getFieldsFromTemplate, useApi, useExtensions, useStores } from '@directus/extensions-sdk';
import { pluralize } from '@directus/utils';
import { Ref, computed, ref, unref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import CollectionResults from './CollectionResults.vue';
import { adjustFieldsForDisplays } from './adjustFieldsForDisplays';

/**
 * Configuration for the module.
 * 
 * During development use the import.
 * For production replace the import with the following:
 *   const GlobalSearchConfig = {"SEARCH_CONFIG": "TO_BE_REPLACED"};
 * 
 * Build and then in the index.js file remove the line and at the top of the index.js file add your config.
 *   eg. const GlobalSearchConfig = { …Your actual config here… }
 */
//import GlobalSearchConfig from './config.js';
const GlobalSearchConfig = {"SEARCH_CONFIG": "TO_BE_REPLACED"};

const { useAppStore, useFieldsStore, useUserStore } = useStores();
const extensions = useExtensions();
const userStore = useUserStore();
const fieldsStore = useFieldsStore();
const appStore = useAppStore();

const api = useApi();
const { t } = useI18n();
const router = useRouter();

function useExtension(type: string, name: string | Ref<string | null>) {
	return computed(() => {
		if (unref(name) === null) return null;
		return (extensions[pluralize(unref(type))].value as any[]).find(({ id }) => id === unref(name)) ?? null;
	});
}

type Index = {
	collection: string;
	display: string;
	limit: number;
	fields: string[];
	filter?: any;
	sort?: string;
};

const indexes: Ref<Record<string, Index>> = ref((GlobalSearchConfig || {}) as Record<string, Index>);
const searchValue = ref(decodeURIComponent(router.currentRoute?.value.hash?.replace('#', '') || ''));
const isSearching = computed(() => searchValue.value?.length >= 3);
const status = ref({
	loading: false,
	time: 0,
	hits: 0,
});
const results: Ref<Record<string, Array<any>>> = ref({});

/**
 * Return the deepest object with the given key exploding on dots, and the value assigned to the last key.
 * Example: ("related.title", { "_contains": "abc" }) returns {"related": {"title": { "_contains": "abc" }}}
 */
function createDeepObject(key: string, value: any): Record<string, any> {
	const keys = key.split('.');
	return keys.reverse().reduce((acc, key) => ({ [key]: acc }), value);
}

/**
 * Search for the given query in all collections as configured
 */
async function search(value: string) {
	const start = Date.now();
	let hits = 0;
	results.value = {};

	// For each item in indexes, we need to search for the search value in the fields.
	const Q = Object.values(indexes.value).map(async (index) => {
		const { collection, limit, display, fields, filter, sort } = index;
		if (fields.length === 0) {
			delete results.value[collection];
			return null;
		}

		results.value[collection] = [];


		const displayFields = adjustFieldsForDisplays(getFieldsFromTemplate(display), collection, { 
			fieldsStore, useExtension
		})

		const params = {
			limit,
			sort: sort || 'id',
			filter: {
				_and: [
					...(filter?._and || []),
					{
						_or: fields.map((field) =>
							createDeepObject(field, {
								_icontains: value,
							})
						),
					}
				],
			},
			fields: ['id'].concat(displayFields),
		};

		const url = collection.startsWith('directus_') ? collection.replace('directus_', '') : `/items/${collection}`;
		const { data } = await api.get(url, { params });
		results.value[collection] = data.data;
		hits += data.data.length;
	});

	await Promise.allSettled(Q);
	status.value.time = Date.now() - start;
	status.value.hits = hits;
	status.value.loading = false;
}

let debouncedSearch;
watch(
	searchValue,
	(value) => {
		clearTimeout(debouncedSearch);
		if (!value || value.length < 3) {
			status.value.loading = false;
			router.replace({ hash: '' });
			return;
		}

		status.value.loading = true;
		router.replace({ hash: '#' + value });
		debouncedSearch = setTimeout(() => search(value), 250);
	},
	{ immediate: true }
);

const currentCollection = ref('');
const currentIndex = ref<Index | null>(null);
watch(currentCollection, (collection) => {
	if (!indexes.value[collection]) {
		indexes.value[collection] = {
			collection,
			limit: 5,
			display: '',
			fields: [],
			filter: {},
		};
	}
	currentIndex.value = indexes.value[collection];
});

const isAdmin = userStore?.currentUser?.role?.admin_access;
const persistedIndexes = isAdmin
	? computed(() => {
			const persist = {};
			Object.values(indexes.value).forEach((index) => {
				if (index.fields.length > 0) {
					persist[index.collection] = index;
				}
			});
			return persist;
	  })
	: indexes;

appStore.sidebarOpen = false;

function updateSearchFields(fields: Array<string>) {
	if (currentIndex.value) {
		currentIndex.value.fields = fields;
	}
}

function updateSearchFilter(filter: Record<string, any>) {
	if (currentIndex.value) {
		currentIndex.value.filter = filter;
	}
}

async function copyJSON(eve) {
	await navigator.clipboard.writeText(eve.target.innerText);
	alert('JSON copied.');
}
</script>

<template>
	<private-view id="global-search" title="Global Search" :class="{'is-admin': isAdmin}">
		<template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="search" />
      </v-button>
    </template>

		<template #sidebar>
			<sidebar-detail v-if="isAdmin" icon="settings" :title="t('configure')" close>
				<fieldset>
					<label>Select a Collection to configure</label>
					<interface-system-collection v-model="currentCollection" includeSystem />
				</fieldset>
				<div v-if="currentIndex" :key="currentCollection">
					<fieldset>
						<label>Display template of search results</label>
						<v-field-template v-model="currentIndex.display" :collection="currentIndex.collection" />						
					</fieldset>

					<fieldset>
						<label>No. of search results {{ currentIndex.limit }}</label>
						<v-slider v-model="currentIndex.limit" :min="1" :max="100" />
					</fieldset>

					<fieldset>
						<label>
							Search fields
							<strong>[{{ currentIndex.fields.length }}]</strong>
						</label>
						<interface-system-field-tree
							:value="currentIndex.fields"
							:collectionName="currentIndex.collection"
							@input="updateSearchFields"
						/>
						<p class="hint">Deselect all fields to remove this collection from being searched</p>
					</fieldset>

					<fieldset>
						<label>Additional filter to apply during query</label>
						<interface-system-filter
							:value="currentIndex.filter"
							:collection-name="currentIndex.collection"
							@input="updateSearchFilter"
						/>						
					</fieldset>
				</div>
				<v-detail label="JSON">
					<pre @click="copyJSON">{{ persistedIndexes }}</pre>
					<p class="hint">Paste this json into the top of the `index.js` file of the global-search module</p>
				</v-detail>
			</sidebar-detail>
		</template>

		<div style="margin: 1rem">
			<v-sheet>
				<div style="width: 300px; margin: 1rem auto">
					<v-input v-model="searchValue" :placeholder="t('search')">
						<template #prepend>
							<v-icon name="search" />
						</template>
						<template #append>
							<v-progress-circular v-show="status.loading" indeterminate />
						</template>
					</v-input>
					<p v-show="isSearching && !status.loading" style="color: var(--foreground-subdued)">
						{{ status.hits }} results returned in {{ status.time }}ms
					</p>
				</div>

				<transition>
					<v-progress-linear v-if="status.loading" indeterminate />
					<v-sheet v-else-if="isSearching" class="search-results">
						<template v-for="(hits, collection) in results" :key="collection">
							<CollectionResults
								v-if="hits && hits.length"
								:key="collection"
								class="search-results-block"
								:collection="collection"
								:display="indexes[collection].display"
								:hits="hits"
							/>
						</template>
						<p v-if="!status.hits" style="width: 100%; text-align: center">
							{{ t('no_results') }}
						</p>
					</v-sheet>
				</transition>
			</v-sheet>
		</div>
	</private-view>
</template>

<style>
#global-search #navigation .module-nav {
	display: none !important;
}
#global-search.is-admin #sidebar.is-open {
	flex-basis: 600px !important;
	width: 600px !important;
	max-width: 100%;
}
#global-search.is-admin #sidebar.is-open .flex-container {
	width: 100% !important;
}

#global-search .search-results {
	display: flex;
	flex-wrap: wrap;
}

#global-search .search-results-block {
	min-width: 300px;
	width: auto;
	flex-grow: 1;
	max-width: 600px;
	padding: 1rem;
}

#global-search p.hint {
	color: var(--foreground-subdued);
	font-size: 12px;
}

@media (max-width: 600px) {
	#global-search .search-results-block {
		width: 100%;
	}
	#global-search .header-bar .title-container .title .type-title {
		font-size: 22px;
		line-height: 28px;
	}
}
</style>
