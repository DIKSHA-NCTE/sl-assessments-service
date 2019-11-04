module.exports = {
  async up(db) {
    global.migrationMsg = "Create indexes on notification collection and create sample notifications."

    await db.collection('notifications').createIndex( { userId: 1} )

    await db.collection('notifications').createIndex( { status: 1 } )

    let observationCreatedNotification = {
      userId: "internal-userId",
      text: "New solution available now (Observation form)",
      status: "created",
      payload:{
        type: "observation",
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }


    let observationSentNotification = {
      userId: "internal-userId",
      text: "New solution available now (Observation form)",
      status: "sent",
      payload:{
        type: "observation",
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }


    let observationReadNotification = {
      userId: "internal-userId",
      text: "New solution available now (Observation form)",
      status: "read",
      payload:{
        type: "observation",
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }


    let assessmentCreatedNotification = {
      userId: "internal-userId",
      text: "New assessment available now (Institutional assessment)",
      status: "created",
      payload:{
        type: "assessment",
        subType: "institutional",
        programId: ObjectID("5c6bd365af0065f0e0d42280"),
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }


    let assessmentSentNotification = {
      userId: "internal-userId",
      text: "New assessment available now (Institutional assessment)",
      status: "sent",
      payload:{
        type: "assessment",
        subType: "institutional",
        programId: ObjectID("5c6bd365af0065f0e0d42280"),
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }


    let assessmentReadNotification = {
      userId: "internal-userId",
      text: "New assessment available now (Individual assessment)",
      status: "read",
      payload:{
        type: "assessment",
        subType: "individual",
        programId: ObjectID("5c6bd365af0065f0e0d42280"),
        solutionId: ObjectID("5d15b0d7463d3a6961f91749"),
        observationId: ObjectID("5d1a002d2dfd8135bc8e1615")
      },
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      isDeleted: false
    }

    return await db.collection('notifications').insertMany( [
      observationCreatedNotification,
      observationSentNotification,
      observationReadNotification,
      assessmentCreatedNotification,
      assessmentSentNotification,
      assessmentReadNotification
    ]);

    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
