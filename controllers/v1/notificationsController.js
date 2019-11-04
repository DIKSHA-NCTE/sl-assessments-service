const notificationsHelper = require(ROOT_PATH + "/module/notifications/helper");

module.exports = class Notifications extends Abstract {

    /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

    /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */

    constructor() {
        super(draftCriteriaSchema);
    }

    static get name() {
        return "notifications";
    }

    /**
    * @api {get} /assessment/api/v1/notifications/list?page=:page&limit=:limit Notifications List
    * @apiVersion 1.0.0
    * @apiName Notifications List
    * @apiGroup Notifications
    * @apiSampleRequest /assessment/api/v1/notifications/list/page=1&limit=10
    * @apiHeader {String} X-authenticated-user-token Authenticity token  
    * @apiUse successBody
    * @apiUse errorBody
    */

    async list(req) {
        return new Promise(async (resolve, reject) => {
        try {

            let matchQuery = {}

            matchQuery["$match"] = {}
            matchQuery["$match"]["draftFrameworkId"] = ObjectId(req.params._id)
            matchQuery["$match"]["isDeleted"] = false
            matchQuery["$match"]["userId"] = req.userDetails.id

            matchQuery["$match"]["$or"] = []
            matchQuery["$match"]["$or"].push({ "name": new RegExp(req.searchText, 'i') }, { "code": new RegExp(req.searchText, 'i') }, { "description": new RegExp(req.searchText, 'i') })

            let draftCriteriaList = await draftCriteriaHelper.list(matchQuery, req.pageSize, req.pageNo)

            let messageData = "Draft criterias fetched successfully";

            if (!draftCriteriaList[0].count) {
            draftCriteriaList[0].count = 0
            messageData = "No draft criterias found"
            }

            return resolve({
            result: draftCriteriaList[0],
            message: messageData
            })

        } catch (error) {
            return reject({
            status: error.status || 500,
            message: error.message || "Oops! something went wrong."
            })
        }
        })
    }

    /**
    * @api {get} /assessment/api/v1/notifications/unreadCount Count of Unread Notifications
    * @apiVersion 1.0.0
    * @apiName Count of Unread Notifications
    * @apiGroup Notifications
    * @apiSampleRequest /assessment/api/v1/notifications/unreadCount
    * @apiHeader {String} X-authenticated-user-token Authenticity token  
    * @apiUse successBody
    * @apiUse errorBody
    */

    async unreadCount(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let draftCriteriaDocument = await database.models.draftCriteria.findOne({
                _id: req.params._id,
                userId: req.userDetails.id
                }).lean()

                if (!draftCriteriaDocument) {
                throw { status: 404, message: "No draft criteria found" };
                }

                return resolve({
                message: "Draft criteria details fetched successfully",
                status: 200,
                result: draftCriteriaDocument
                })

            } catch (error) {
                reject({
                status: error.status || 500,
                message: error.message || "Oops! something went wrong."
                })
            }
        })
    }

    /**
     * @api {post} /assessment/api/v1/draftCriteria/markItRead/{{notificationId}} Mark a Notification Read
     * @apiVersion 1.0.0
     * @apiName Mark a Notification Read
     * @apiGroup Notifications
     * @apiSampleRequest /assessment/api/v1/draftCriteria/markItRead/5db0292179e31f1b85d11ca9
     * @apiUse successBody
     * @apiUse errorBody
     */

    async markItRead(req) {
        return new Promise(async (resolve, reject) => {
        
            try {

                let findQuery = {
                _id: req.params._id,
                userId: req.userDetails.id
                }

                await draftCriteriaHelper.update(findQuery, { isDeleted: true })

                return resolve({
                message: "Draft criteria deleted successfully",
                status: 200
                })
            } catch (error) {
                reject({
                status: error.status || 500,
                message: error.message || "Oops! something went wrong."
                })
            }
        })

    }

};



