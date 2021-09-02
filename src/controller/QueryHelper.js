"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const ValidateBodyHelper_1 = require("./ValidateBodyHelper");
const ValidateOptionsHelper_1 = require("./ValidateOptionsHelper");
const ValidateTransformationsHelper_1 = require("./ValidateTransformationsHelper");
class QueryHelper {
    static readQuery(query) {
        if (this.checkProperties(query, ["WHERE", "OPTIONS", "TRANSFORMATIONS"])) {
            let where = query.WHERE;
            let options = query.OPTIONS;
            try {
                let doneQ;
                if (Object.keys(query).includes("TRANSFORMATIONS")) {
                    this.ContainsTransformations = true;
                    let transformations = query.TRANSFORMATIONS;
                    let q = this.placeholderQueryWithTransformations();
                    doneQ = this.validateAll(where, options, transformations, q);
                }
                else {
                    let q = this.placeholderQuery();
                    doneQ = this.validateAll(where, options, null, q);
                }
                doneQ.datasetID = this.dataSetToQuery;
                this.resetParameters();
                return doneQ;
            }
            catch (err) {
                this.resetParameters();
                return new IInsightFacade_1.InsightError(err.message);
            }
        }
        else {
            this.resetParameters();
            return new IInsightFacade_1.InsightError();
        }
    }
    static validateAll(where, options, transformations, q) {
        let currQ = q;
        currQ.OPTIONS = ValidateOptionsHelper_1.default.validateOptions(options, currQ.OPTIONS);
        if (transformations !== null) {
            currQ.TRANSFORMATIONS = ValidateTransformationsHelper_1.default.
                validateTransformations(currQ.TRANSFORMATIONS, transformations);
        }
        if (Object.keys(where).length === 0) {
            let emptyWhere = {};
            currQ.BODY = emptyWhere;
        }
        else {
            let placeHolderBody = {};
            currQ.BODY = ValidateBodyHelper_1.default.validateBody(placeHolderBody, where);
        }
        return currQ;
    }
    static checkProperties(queryObject, checkList) {
        for (let key of Object.keys(queryObject)) {
            if (!checkList.includes(key)) {
                return false;
            }
        }
        return true;
    }
    static CheckForInvalidKey(comparedTo, validKeys) {
        for (let validKey of validKeys) {
            if (comparedTo === QueryHelper.dataSetToQuery + "_" + validKey) {
                return false;
            }
        }
        return true;
    }
    static resetParameters() {
        this.dataSetToQuery = "";
        this.FirstDataSetFound = false;
        this.ContainsTransformations = false;
        this.ColumnKeys = [];
        this.UniversalFields = [];
        this.UniversalMFields = [];
        this.UniversalSFields = [];
    }
    static placeholderQueryWithTransformations() {
        let placeholderWhere = {};
        let placeholderOptions = {
            COLUMNS: []
        };
        let placeholderGroup = {
            KEYS: []
        };
        let placeholderApply = {
            APPLYRULES: []
        };
        let placeholderTransformations = {
            GROUP: placeholderGroup,
            APPLY: placeholderApply
        };
        let q = {
            datasetID: "",
            BODY: placeholderWhere,
            OPTIONS: placeholderOptions,
            TRANSFORMATIONS: placeholderTransformations
        };
        return q;
    }
    static placeholderQuery() {
        let placeholderWhere = {};
        let placeholderOptions = {
            COLUMNS: []
        };
        let q = {
            datasetID: "",
            BODY: placeholderWhere,
            OPTIONS: placeholderOptions
        };
        return q;
    }
}
exports.default = QueryHelper;
QueryHelper.dataSetToQuery = "";
QueryHelper.FirstDataSetFound = false;
QueryHelper.ContainsTransformations = false;
QueryHelper.ColumnKeys = [];
QueryHelper.RoomFields = ["lat", "lon", "seats", "fullname", "shortname", "number",
    "name", "address", "type", "furniture", "href"];
QueryHelper.RoomMFields = ["lat", "lon", "seats"];
QueryHelper.RoomSFields = ["fullname", "shortname", "number",
    "name", "address", "type", "furniture", "href"];
QueryHelper.CourseFields = ["avg", "pass", "fail", "audit", "year",
    "dept", "id", "instructor", "title", "uuid"];
QueryHelper.CourseMFields = ["avg", "pass", "fail", "audit", "year"];
QueryHelper.CourseSFields = ["dept", "id", "instructor", "title", "uuid"];
QueryHelper.UniversalFields = [];
QueryHelper.UniversalMFields = [];
QueryHelper.UniversalSFields = [];
//# sourceMappingURL=QueryHelper.js.map