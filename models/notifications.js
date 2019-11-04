module.exports = {
    name: "notifications",
    schema: {
      userId: {
        type: String,
        required: true,
        default: ""
      },
      text: {
        type: String,
        required: true,
        default: ""
      },
      payload: {
        type: Object
      },
      status: {
        type: String,
        required: true,
        default: ""
      }
    }
  };