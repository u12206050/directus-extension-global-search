export default {
	things: {
		collection: 'things',
		limit: 10,
		display: 'The {{title}} in {{topic.name}}',
		fields: ['title', 'topic.name'],
		filter: {
			_and: [
				{ topic: { _exists: true } },
			]
		},
		sort: 'name',
	},
	topics: {
		collection: 'topics',
		limit: 5,
		display: '{{name}}',
		fields: ['name'],
	},
	happenings: {
		collection: 'happenings',
		limit: 5,
		display: '{{label}} [{{status}}]',
		fields: ['topic.name', 'label'],
	},
}