<script lang="ts" setup>
import { useCollection } from '@directus/extensions-sdk';

const props = defineProps({
	collection: {
		type: String,
		required: true,
	},
	display: {
		type: String,
		default: null,
	},
	hits: {
		type: Array,
		required: true,
		default: () => [],
	},
});

const { info, primaryKeyField } = useCollection(props.collection);

const displayTemplate = props.display ?? info.value?.meta?.display_template ?? '{{title}}';
</script>

<template>
	<v-list v-if="info">
		<v-list-item
			v-for="hit in hits"
			:key="`${collection}-${hit[primaryKeyField.field]}`"
			block
			clickable
			:to="`/content/${collection}/${hit[primaryKeyField.field]}`"
			:title="`${ collection } #${ hit[primaryKeyField.field] }`"
		>
			<v-icon :name="info.icon" left />
			<render-template :collection="info.collection" :item="hit" :template="displayTemplate" />
		</v-list-item>
	</v-list>
</template>
