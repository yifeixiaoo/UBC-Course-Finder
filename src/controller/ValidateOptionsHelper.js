"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const QueryHelper_1 = require("./QueryHelper");
class ValidateOptionsHelper {
    static validateOptions(options, O) {
        let currO = O;
        if (!QueryHelper_1.default.ContainsTransformations) {
            if (("COLUMNS" in options) && !("ORDER" in options) &&
                QueryHelper_1.default.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumns(currO, options.COLUMNS);
            }
            else if (("COLUMNS" in options) && ("ORDER" in options) &&
                QueryHelper_1.default.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsAndOrder(currO, options.COLUMNS, options.ORDER);
            }
            else if (!("COLUMNS" in options)) {
                throw new IInsightFacade_1.InsightError("missing columns");
            }
            else {
                throw new IInsightFacade_1.InsightError("options error");
            }
        }
        else {
            if (("COLUMNS" in options) && !("ORDER" in options) &&
                QueryHelper_1.default.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsWithTransformations(currO, options.COLUMNS);
            }
            else if (("COLUMNS" in options) && ("ORDER" in options) &&
                QueryHelper_1.default.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsAndOrder(currO, options.COLUMNS, options.ORDER);
            }
            else if (!("COLUMNS" in options)) {
                throw new IInsightFacade_1.InsightError("missing columns");
            }
            else {
                throw new IInsightFacade_1.InsightError("options err");
            }
        }
        return currO;
    }
    static validateColumnsWithTransformations(O, columns) {
        let currO = O;
        let AllColumns = Object.values(columns);
        if (AllColumns.length < 1) {
            throw new IInsightFacade_1.InsightError("columns with transformations must be non empty");
        }
        for (let column of AllColumns) {
            if (column.toString().includes("_") && (QueryHelper_1.default.FirstDataSetFound === false)) {
                QueryHelper_1.default.dataSetToQuery = column.toString().substr(0, column.toString().indexOf("_"));
                QueryHelper_1.default.FirstDataSetFound = true;
                let field = column.toString().split("_")[1];
                if (QueryHelper_1.default.RoomFields.includes(field)) {
                    QueryHelper_1.default.UniversalFields = QueryHelper_1.default.RoomFields;
                    QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.RoomMFields;
                    QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.RoomSFields;
                }
                else if (QueryHelper_1.default.CourseFields.includes(field)) {
                    QueryHelper_1.default.UniversalFields = QueryHelper_1.default.CourseFields;
                    QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.CourseMFields;
                    QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.CourseSFields;
                }
                else {
                    throw new IInsightFacade_1.InsightError("invalid rooms or courses key");
                }
            }
            else if (column.toString().includes("_") && (QueryHelper_1.default.FirstDataSetFound === true)) {
                if (column.toString().substr(0, column.toString().indexOf("_")) !== QueryHelper_1.default.dataSetToQuery) {
                    throw new IInsightFacade_1.InsightError("Cannot query more than one dataset (columns)");
                }
            }
            QueryHelper_1.default.ColumnKeys.push(column.toString());
        }
        currO.COLUMNS = columns;
        return currO;
    }
    static validateColumns(O, columns) {
        let currO = O;
        let AllColumns = Object.values(columns);
        if (AllColumns.length < 1) {
            throw new IInsightFacade_1.InsightError("columns must be non empty");
        }
        if (AllColumns[0].toString().includes("_")) {
            QueryHelper_1.default.dataSetToQuery = AllColumns[0].toString().substr(0, AllColumns[0].toString().indexOf("_"));
            let field = AllColumns[0].toString().split("_")[1];
            if (QueryHelper_1.default.RoomFields.includes(field)) {
                QueryHelper_1.default.UniversalFields = QueryHelper_1.default.RoomFields;
                QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.RoomMFields;
                QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.RoomSFields;
            }
            else if (QueryHelper_1.default.CourseFields.includes(field)) {
                QueryHelper_1.default.UniversalFields = QueryHelper_1.default.CourseFields;
                QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.CourseMFields;
                QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.CourseSFields;
            }
            else {
                throw new IInsightFacade_1.InsightError("invalid rooms or courses key");
            }
        }
        else {
            throw new IInsightFacade_1.InsightError("Invalid key");
        }
        for (let column of AllColumns) {
            if (QueryHelper_1.default.CheckForInvalidKey(column.toString(), QueryHelper_1.default.UniversalFields)) {
                throw new IInsightFacade_1.InsightError("invalid field");
            }
        }
        currO.COLUMNS = columns;
        return currO;
    }
    static validateColumnsAndOrder(O, columns, order) {
        let currO;
        if (QueryHelper_1.default.ContainsTransformations) {
            currO = this.validateColumnsWithTransformations(O, columns);
        }
        else {
            currO = this.validateColumns(O, columns);
        }
        currO.ORDER = this.validateOrder(currO.ORDER, order);
        if (typeof currO.ORDER === "string") {
            let columnContainsOrder = false;
            currO.COLUMNS.forEach(function (obj) {
                if (currO.ORDER === obj) {
                    columnContainsOrder = true;
                }
            });
            if (!columnContainsOrder) {
                throw new IInsightFacade_1.InsightError("ORDER key must be in COLUMNS");
            }
        }
        else {
            let numConfirmedOrderKeysInColumns = 0;
            let keyList = currO.ORDER.KEYS;
            keyList.forEach(function (obj) {
                if (currO.COLUMNS.includes(obj)) {
                    numConfirmedOrderKeysInColumns += 1;
                }
            });
            if (numConfirmedOrderKeysInColumns !== Object.keys(keyList).length) {
                throw new IInsightFacade_1.InsightError("ORDER keys must be in COLUMNS");
            }
        }
        return currO;
    }
    static validateOrder(O, order) {
        if (typeof order === "object") {
            if (QueryHelper_1.default.checkProperties(order, ["dir", "keys"])) {
                let outputOrder = {
                    KEYS: [],
                    DIRECTION: "UP"
                };
                if ((order.dir === "UP") || (order.dir === "DOWN")) {
                    outputOrder.DIRECTION = order.dir;
                }
                else {
                    throw new IInsightFacade_1.InsightError("direction must be UP or DOWN");
                }
                if (Object.keys(order.keys).length > 0) {
                    outputOrder.KEYS = order.keys;
                }
                else {
                    throw new IInsightFacade_1.InsightError("ORDER keys must be non-empty array");
                }
                return outputOrder;
            }
            else {
                throw new IInsightFacade_1.InsightError("Order Object dir/keys error");
            }
        }
        else {
            return order.toString();
        }
    }
}
exports.default = ValidateOptionsHelper;
//# sourceMappingURL=ValidateOptionsHelper.js.map