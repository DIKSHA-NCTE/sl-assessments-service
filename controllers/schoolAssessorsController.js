module.exports = class test extends AbstractController {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schoolAssessors";
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }
  find(req) {
    // req.db = "cassandra";
    req.query = { userId: req.userDetails.userId };
    req.populate = "schools";
    console.log(req.query, req.populate);

    // return super.find(req);
    return super.populate(req);
  }
};
