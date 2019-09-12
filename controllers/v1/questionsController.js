const csv = require("csvtojson");
const questionsHelper = require(ROOT_PATH + "/module/questions/helper");
const FileStream = require(ROOT_PATH + "/generics/fileStream");

module.exports = class Questions extends Abstract {
  constructor() {
    super(questionsSchema);
  }

  static get name() {
    return "questions";
  }

  /**
   * @api {post} /assessment/api/v1/questions/setGeneralQuestions Upload General Questions
   * @apiVersion 0.0.1
   * @apiName Upload General Questions
   * @apiGroup Questions
   * @apiParam {File} questions     Mandatory questions file of type CSV.
   * @apiUse successBody
   * @apiUse errorBody
   */

  async setGeneralQuestions(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let questionData = await csv().fromString(
          req.files.questions.data.toString()
        );

        questionData = await Promise.all(
          questionData.map(async question => {
            if (question.externalId && question.isAGeneralQuestion) {
              question = await database.models.questions.findOneAndUpdate(
                { externalId: question.externalId },
                {
                  $set: {
                    isAGeneralQuestion:
                      question.isAGeneralQuestion === "TRUE" ? true : false
                  }
                },
                {
                  returnNewDocument: true
                }
              );
              return question;
            } else {
              return;
            }
          })
        );

        if (
          questionData.findIndex(
            question => question === undefined || question === null
          ) >= 0
        ) {
          throw "Something went wrong, not all records were inserted/updated.";
        }

        let responseMessage = "Questions updated successfully.";

        let response = { message: responseMessage };

        return resolve(response);
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  /**
   * @api {post} /assessment/api/v1/questions/upload Upload Questions CSV
   * @apiVersion 0.0.1
   * @apiName Upload Questions CSV
   * @apiGroup Questions
   * @apiParam {File} questions     Mandatory questions file of type CSV.
   * @apiUse successBody
   * @apiUse errorBody
   */
  upload(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.files || !req.files.questions) {
          let responseMessage = "Bad request.";
          return resolve({ status: 400, message: responseMessage });
        }

        let questionData = await csv().fromString(
          req.files.questions.data.toString()
        );

        // let questionDocument = await questionsHelper.questionTemplate(questionData)

        let criteriaIds = new Array();
        let criteriaObject = {};

        let questionCollection = {};
        let questionIds = new Array();

        let solutionDocument = await database.models.solutions
          .findOne(
            { externalId: questionData[0]["solutionId"] },
            { evidenceMethods: 1, sections: 1, themes: 1 }
          )
          .lean();

        let criteriasIdArray = gen.utils.getCriteriaIds(
          solutionDocument.themes
        );

        let criteriasArray = new Array();

        criteriasIdArray.forEach(eachCriteriaIdArray => {
          criteriasArray.push(eachCriteriaIdArray._id.toString());
        });

        // No changes required here.
        questionData.forEach(eachQuestionData => {
          let parsedQuestion = gen.utils.valueParser(eachQuestionData);

          if (parsedQuestion["criteriaExternalId"] && parsedQuestion["criteriaExternalId"] != "" && !criteriaIds.includes(parsedQuestion["criteriaExternalId"])) {
            criteriaIds.push(parsedQuestion["criteriaExternalId"]);
          }

          if (!questionIds.includes(parsedQuestion["externalId"]))
            questionIds.push(parsedQuestion["externalId"]);

          if (
            parsedQuestion["hasAParentQuestion"] !== "NO" &&
            !questionIds.includes(parsedQuestion["parentQuestionId"])
          ) {
            questionIds.push(parsedQuestion["parentQuestionId"]);
          }

          if (
            parsedQuestion["instanceParentQuestionId"] !== "NA" &&
            !questionIds.includes(parsedQuestion["instanceParentQuestionId"])
          ) {
            questionIds.push(parsedQuestion["instanceParentQuestionId"]);
          }
        });

        let criteriaDocument = await database.models.criteria
          .find({
            externalId: { $in: criteriaIds }
          })
          .lean();

        if (!criteriaDocument.length > 0) {
          throw "No criteria found for the given solution"
        }

        criteriaDocument.forEach(eachCriteriaDocument => {
          if (criteriasArray.includes(eachCriteriaDocument._id.toString())) {
            criteriaObject[
              eachCriteriaDocument.externalId
            ] = eachCriteriaDocument;
          }
        });

        let questionsFromDatabase = await database.models.questions
          .find({
            externalId: { $in: questionIds }
          })
          .lean();

        if (questionsFromDatabase.length > 0) {
          questionsFromDatabase.forEach(question => {
            questionCollection[question.externalId] = question;
          });
        }

        const fileName = `Question-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();

        let pendingItems = new Array();

        // Question from csv
        function questionInCsv(parsedQuestionData) {
          let question = {};

          if (questionCollection[parsedQuestionData["externalId"]]) {
            question[parsedQuestionData["externalId"]] =
              questionCollection[parsedQuestionData["externalId"]];
          }

          if (
            parsedQuestionData["instanceParentQuestionId"] !== "NA" &&
            questionCollection[parsedQuestionData["instanceParentQuestionId"]]
          ) {
            question[parsedQuestionData["instanceParentQuestionId"]] =
              questionCollection[parsedQuestionData["instanceParentQuestionId"]];
          }

          if (
            parsedQuestionData["hasAParentQuestion"] == "YES" &&
            questionCollection[parsedQuestionData["parentQuestionId"]]
          ) {
            question[parsedQuestionData["parentQuestionId"]] =
              questionCollection[parsedQuestionData["parentQuestionId"]];
          }
          return question
        }

        // Create question
        // function createQuestion(parsedQuestion, question, criteria, ecm, section) {
        //   let resultFromCreateQuestions = questionsHelper.createQuestions(
        //     parsedQuestion,
        //     question,
        //     criteria,
        //     ecm,
        //     section
        //   );

        //   return resultFromCreateQuestions
        // }

        let questionStatus = false

        for (
          let pointerToQuestionData = 0;
          pointerToQuestionData < questionData.length;
          pointerToQuestionData++
        ) {
          let parsedQuestion = gen.utils.valueParser(
            questionData[pointerToQuestionData]
          );

          let criteria = {};
          let ecm = {};
          let csv = {}

          csv["Question External Id"] = parsedQuestion.externalId
          csv["Question Name"] = parsedQuestion["question0"]

          if(solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]]){
            ecm[parsedQuestion["evidenceMethod"]] = {
              code:
                solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]]
                  .externalId
            };
          } else{
            questionStatus = true
            csv["status"] = "Ecm is not found in the given solution"
          }

          if(criteriaObject[parsedQuestion.criteriaExternalId]){
            criteria[parsedQuestion.criteriaExternalId] =
            criteriaObject[parsedQuestion.criteriaExternalId];
          } else {
            questionStatus = true
            csv["status"] = "Criteria is not found in the given solution"
          }

          let section

          if (solutionDocument.sections[parsedQuestion.section]) {
            section = parsedQuestion.section;
          } else{
            questionStatus = true
            csv["status"] = "section is not found in the given solution"
          }

          if(parsedQuestion["hasAParentQuestion"] === ""){
            questionStatus = true
            csv["status"] = "hasAParentQuestion should be either YES or NO"
          }

          if(parsedQuestion["instanceParentQuestionId"] === ""){
            questionStatus = true
            csv["status"] = "instanceParentQuestionId should be either NA or parent question id"
          }


          if(!questionStatus){
              let question = questionInCsv(parsedQuestion)

            if (
              (parsedQuestion["hasAParentQuestion"] == "YES" &&
                !questionCollection[parsedQuestion["parentQuestionId"]]) ||
              (parsedQuestion["instanceParentQuestionId"] !== "NA" &&
                !questionCollection[parsedQuestion["instanceParentQuestionId"]])
            ) {
              pendingItems.push({
                csvResponse:csv,
                parsedQuestion: parsedQuestion,
                question:question,
                criteriaToBeSent: criteria,
                evaluationFrameworkMethod: ecm,
                section: section
              });
            } else {
    
              let resultFromCreateQuestions = await questionsHelper.createQuestions(parsedQuestion, question, criteria, ecm, section)
  
              if (resultFromCreateQuestions.result) {
                questionCollection[resultFromCreateQuestions.result.externalId] =
                  resultFromCreateQuestions.result;
              }

              csv = _.merge(csv,resultFromCreateQuestions.csvResult)
            }
          } else {
            csv["_SYSTEM_ID"] = "Not Created"
          }
          input.push(csv)
        }

        if (pendingItems) {
          for (
            let pointerToPendingData = 0;
            pointerToPendingData < pendingItems.length;
            pointerToPendingData++
          ) {

            // let question = questionInCsv(pendingItems[pointerToPendingData].parsedQuestion)

            let csvQuestionData = await questionsHelper.createQuestions(pendingItems[pointerToPendingData].parsedQuestion, pendingItems[pointerToPendingData].question, pendingItems[pointerToPendingData].criteriaToBeSent, pendingItems[pointerToPendingData].evaluationFrameworkMethod, pendingItems[pointerToPendingData].section)
            
            csvQuestionData.csvResult = _.merge(csvQuestionData.csvResult,pendingItems[pointerToPendingData].csvResponse)

            input.push(csvQuestionData.csvResult);
          }
        }

        input.push(null);
      } catch (error) {
        reject({
          message: error
        });
      }
    });
  }

  /**
   * @api {post} /assessment/api/v1/questions/bulkUpdate Bulk update Questions CSV
   * @apiVersion 0.0.1
   * @apiName Bulk update Questions CSV
   * @apiGroup Questions
   * @apiParam {File} questions     Mandatory questions file of type CSV.
   * @apiUse successBody
   * @apiUse errorBody
   */
  bulkUpdate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.files || !req.files.questions) {
          let responseMessage = "Bad request.";
          return resolve({ status: 400, message: responseMessage });
        }

        let questionData = await csv().fromString(
          req.files.questions.data.toString()
        );

        let solutionDocument = await database.models.solutions
          .findOne(
            { externalId: questionData[0]["solutionId"] },
            { evidenceMethods: 1, sections: 1, themes: 1 }
          )
          .lean();

        let criteriasIdArray = gen.utils.getCriteriaIds(
          solutionDocument.themes
        );

        if (criteriasIdArray.length < 1) {
          throw "No criteria found for the given solution"
        }

        let allCriteriaDocument = await database.models.criteria
          .find({ _id: { $in: criteriasIdArray } }, { evidences: 1, externalId: 1 })
          .lean();

        if (allCriteriaDocument.length < 1) {
          throw "No criteria found for the given solution"
        }

        let currentQuestionMap = {};

        let criteriaMap = {};

        allCriteriaDocument.forEach(eachCriteria => {

          criteriaMap[eachCriteria.externalId] = eachCriteria._id.toString()

          eachCriteria.evidences.forEach(eachEvidence => {
            eachEvidence.sections.forEach(eachSection => {
              eachSection.questions.forEach(eachQuestion => {
                currentQuestionMap[eachQuestion.toString()] = {
                  qid: eachQuestion.toString(),
                  sectionCode: eachSection.code,
                  evidenceMethodCode: eachEvidence.code,
                  criteriaId: eachCriteria._id.toString(),
                  criteriaExternalId: eachCriteria.externalId
                }
              })
            })
          })
        })

        let allQuestionsDocument = await database.models.questions
          .find(
            { _id: { $in: Object.keys(currentQuestionMap) } },
            {
              externalId: 1,
              children: 1,
              instanceQuestions: 1
            }
          )
          .lean();

        if (allQuestionsDocument.length < 1) {
          throw "No question found for the given solution"
        }

        let questionExternalToInternalIdMap = {};
        allQuestionsDocument.forEach(eachQuestion => {

          currentQuestionMap[eachQuestion._id.toString()].externalId = eachQuestion.externalId
          questionExternalToInternalIdMap[eachQuestion.externalId] = eachQuestion._id.toString()

          if (eachQuestion.children && eachQuestion.children.length > 0) {
            eachQuestion.children.forEach(childQuestion => {
              if (currentQuestionMap[childQuestion.toString()]) {
                currentQuestionMap[childQuestion.toString()].parent = eachQuestion._id.toString()
              }
            })
          }

          if (eachQuestion.instanceQuestions && eachQuestion.instanceQuestions.length > 0) {
            eachQuestion.instanceQuestions.forEach(instanceChildQuestion => {
              if (currentQuestionMap[instanceChildQuestion.toString()]) {
                currentQuestionMap[instanceChildQuestion.toString()].instanceParent = eachQuestion._id.toString()
              }
            })
          }

        });

        const fileName = `Question-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();

        let pendingItems = new Array();

        for (
          let pointerToQuestionData = 0;
          pointerToQuestionData < questionData.length;
          pointerToQuestionData++
        ) {

          let parsedQuestion = gen.utils.valueParser(
            questionData[pointerToQuestionData]
          );

          if (!parsedQuestion["_SYSTEM_ID"] || parsedQuestion["_SYSTEM_ID"] == "" || !currentQuestionMap[parsedQuestion["_SYSTEM_ID"]]) {
            parsedQuestion["UPDATE_STATUS"] = "Invalid Question Internal ID"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
            continue
          }

          if (!parsedQuestion["criteriaExternalId"] || parsedQuestion["criteriaExternalId"] == "" || !criteriaMap[parsedQuestion["criteriaExternalId"]]) {
            parsedQuestion["UPDATE_STATUS"] = "Invalid Criteria External ID"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
            continue
          } else {
            parsedQuestion["_criteriaInternalId"] = criteriaMap[parsedQuestion["criteriaExternalId"]]
          }

          let ecm = (solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]] && solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]].externalId) ? solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]].externalId : ""
          if (ecm == "") {
            parsedQuestion["UPDATE_STATUS"] = "Invalid Evidence Method Code"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
            continue
          } else {
            parsedQuestion["_evidenceMethodCode"] = solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]].externalId
          }

          let section = (solutionDocument.sections[parsedQuestion.section]) ? solutionDocument.sections[parsedQuestion.section] : ""
          if (section == "") {
            parsedQuestion["UPDATE_STATUS"] = "Invalid Section Method Code"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }))
            continue
          } else {
            parsedQuestion["_sectionCode"] = parsedQuestion.section
          }

          // Parent question CSV data validation begins.
          parsedQuestion["hasAParentQuestion"] = parsedQuestion["hasAParentQuestion"].toUpperCase()

          if (parsedQuestion["hasAParentQuestion"] != "YES" && parsedQuestion["hasAParentQuestion"] != "NO") {

            parsedQuestion["UPDATE_STATUS"] = "Invalid value for column hasAParentQuestion"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
            continue

          } else if (parsedQuestion["hasAParentQuestion"] == "YES") {

            if (parsedQuestion["parentQuestionId"] == "" || !currentQuestionMap[questionExternalToInternalIdMap[parsedQuestion["parentQuestionId"]]]) {
              parsedQuestion["UPDATE_STATUS"] = "Invalid Parent Question ID"
              input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
              continue
            } else {
              parsedQuestion["_parentQuestionId"] = questionExternalToInternalIdMap[parsedQuestion["parentQuestionId"]]
            }

          } else if (parsedQuestion["hasAParentQuestion"] == "NO") {
            parsedQuestion["_parentQuestionId"] = ""
          }
          // Parent question CSV data validation ends.


          // Instance Parent question CSV data validation begins.
          parsedQuestion["instanceParentQuestionId"] = parsedQuestion["instanceParentQuestionId"].toUpperCase()
          if (parsedQuestion["instanceParentQuestionId"] == "") {

            parsedQuestion["UPDATE_STATUS"] = "Invalid value for column instanceParentQuestionId"
            input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
            continue

          } else if (parsedQuestion["instanceParentQuestionId"] == "NA") {

            parsedQuestion["_instanceParentQuestionId"] = ""

          } else {

            if (currentQuestionMap[questionExternalToInternalIdMap[parsedQuestion["instanceParentQuestionId"]]] && currentQuestionMap[questionExternalToInternalIdMap[parsedQuestion["instanceParentQuestionId"]]] != "") {
              parsedQuestion["_instanceParentQuestionId"] = questionExternalToInternalIdMap[parsedQuestion["instanceParentQuestionId"]]
            } else {
              parsedQuestion["UPDATE_STATUS"] = "Invalid Instance Parent Question ID"
              input.push(_.omitBy(parsedQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }));
              continue
            }

          }
          // Instance Parent question CSV data validation ends.

          let currentQuestion = currentQuestionMap[parsedQuestion["_SYSTEM_ID"]]

          if (currentQuestion.criteriaId != parsedQuestion["_criteriaInternalId"] || currentQuestion.sectionCode != parsedQuestion["_sectionCode"] || currentQuestion.evidenceMethodCode != parsedQuestion["_evidenceMethodCode"]) {
            // remove question from criteria (qid,criteiaid, ecm, section)
            let criteriaToUpdate = await database.models.criteria.findOne(
              {
                _id: ObjectId(currentQuestion.criteriaId)
              },
              {
                evidences: 1
              }
            )

            criteriaToUpdate.evidences.forEach(eachEvidence => {
              if (eachEvidence.code == currentQuestion.evidenceMethodCode) {
                eachEvidence.sections.forEach(eachSection => {
                  if (eachSection.code == currentQuestion.sectionCode) {
                    let newSectionQuestions = new Array
                    for (let questionObjectPointer = 0; questionObjectPointer < eachSection.questions.length; questionObjectPointer++) {
                      if (eachSection.questions[questionObjectPointer].toString() != currentQuestion.qid) {
                        newSectionQuestions.push(eachSection.questions[questionObjectPointer])
                      }
                    }
                    eachSection.questions = newSectionQuestions
                  }
                })
              }
            })

            let queryCriteriaObject = {
              _id: criteriaToUpdate._id
            }

            let updateCriteriaObject = {}
            updateCriteriaObject.$set = {
              ["evidences"]: criteriaToUpdate.evidences
            }

            await database.models.criteria.findOneAndUpdate(
              queryCriteriaObject,
              updateCriteriaObject
            )

            parsedQuestion["_setQuestionInCriteria"] = true
          }

          if (currentQuestion.instanceParent && currentQuestion.instanceParent != "" && currentQuestion.instanceParent != parsedQuestion["_instanceParentQuestionId"]) {
            // remove instance child from instance parent (childQid,instanceParentQid)
            await database.models.questions.findOneAndUpdate(
              {
                _id: ObjectId(currentQuestion.instanceParent)
              },
              {
                $pull: { instanceQuestions: ObjectId(currentQuestion.qid) }
              }, {
                _id: 1
              }
            );
          }


          if (currentQuestion.parent && currentQuestion.parent != "" && currentQuestion.parent != parsedQuestion["_parentQuestionId"]) {
            // remove child from parent and , parent from child (childQid,parentQid)

            await database.models.questions.findOneAndUpdate(
              {
                _id: ObjectId(currentQuestion.qid)
              },
              {
                $pull: { visibleIf: { "_id": ObjectId(currentQuestion.parent) } }
              }, {
                _id: 1
              }
            );

            await database.models.questions.findOneAndUpdate(
              {
                _id: ObjectId(currentQuestion.parent)
              },
              {
                $pull: { children: ObjectId(currentQuestion.qid) }
              }, {
                _id: 1
              }
            );
          }

          let updateQuestion = await questionsHelper.updateQuestion(
            parsedQuestion
          );

          input.push(_.omitBy(updateQuestion, (value, key) => { return _.startsWith(key, "_") && key != "_SYSTEM_ID" }))
        }

        input.push(null);

      } catch (error) {
        reject({
          message: error
        });
      }
    });
  }


};
