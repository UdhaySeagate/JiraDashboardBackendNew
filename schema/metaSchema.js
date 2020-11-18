/**
 * Mongoose schema file to define collection
 */
const mongoose = require('mongoose');

const Schema = mongoose.Schema;
// Creating Common model to store meta information
const MetaSchema = new Schema(
  {
    projectIdOrKey: {
      type: String,
      required: true
    },
    boardId: {
      type: String,
      required: true
    },
    pi: {
      type: Array,
      required: false
    },
    components: {
      type: Array,
      required: false
    },
    sprints: {
      type: Array,
      required: false
    },
    velocity: {
      type: Array,
      required: false
    },
    health: {
      type: Array,
      required: false
    },
    burndown: {
      type: Array,
      required: false
    }
  },
  { timestamps: true },
  { collection: 'meta' }
);

module.exports = mongoose.model('Meta', MetaSchema);
