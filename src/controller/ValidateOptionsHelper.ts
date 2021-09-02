import {InsightError, Options, Order} from "./IInsightFacade";
import QueryHelper from "./QueryHelper";
import Log from "../Util";

export default class ValidateOptionsHelper {
    public static validateOptions (options: any, O: Options): Options {
        let currO = O;
        if (!QueryHelper.ContainsTransformations) {
            if (("COLUMNS" in options) && !("ORDER" in options) &&
                QueryHelper.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumns(currO, options.COLUMNS);
            } else if (("COLUMNS" in options) && ("ORDER" in options) &&
                QueryHelper.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsAndOrder(currO, options.COLUMNS, options.ORDER);
            } else if (!("COLUMNS" in options)) {
                throw new InsightError("missing columns");
            } else {
                throw new InsightError("options error");
            }
        } else {
            if (("COLUMNS" in options) && !("ORDER" in options) &&
                QueryHelper.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsWithTransformations(currO, options.COLUMNS);
            } else if (("COLUMNS" in options) && ("ORDER" in options) &&
                QueryHelper.checkProperties(options, ["COLUMNS", "ORDER"])) {
                currO = this.validateColumnsAndOrder(currO, options.COLUMNS, options.ORDER);
            } else if (!("COLUMNS" in options)) {
                throw new InsightError("missing columns");
            } else {
                throw new InsightError("options err");
            }
        }
        return currO;
    }

    public static validateColumnsWithTransformations (O: Options, columns: any): Options {
        let currO = O;
        let AllColumns = Object.values(columns);
        if (AllColumns.length < 1) {
            throw new InsightError("columns with transformations must be non empty");
        }
        for (let column of AllColumns) {
            if (column.toString().includes("_") && (QueryHelper.FirstDataSetFound === false)) {
                QueryHelper.dataSetToQuery = column.toString().substr(0, column.toString().indexOf("_"));
                QueryHelper.FirstDataSetFound = true;
                let field = column.toString().split("_")[1];
                if (QueryHelper.RoomFields.includes(field)) {
                    QueryHelper.UniversalFields = QueryHelper.RoomFields;
                    QueryHelper.UniversalMFields = QueryHelper.RoomMFields;
                    QueryHelper.UniversalSFields = QueryHelper.RoomSFields;
                } else if (QueryHelper.CourseFields.includes(field)) {
                    QueryHelper.UniversalFields = QueryHelper.CourseFields;
                    QueryHelper.UniversalMFields = QueryHelper.CourseMFields;
                    QueryHelper.UniversalSFields = QueryHelper.CourseSFields;
                } else {
                    throw new InsightError("invalid rooms or courses key");
                }
            } else if (column.toString().includes("_") && (QueryHelper.FirstDataSetFound === true)) {
                if (column.toString().substr(0, column.toString().indexOf("_")) !== QueryHelper.dataSetToQuery) {
                    throw new InsightError("Cannot query more than one dataset (columns)");
                }
            }
            QueryHelper.ColumnKeys.push(column.toString());
        }
        currO.COLUMNS = columns;
        return currO;
    }

    public static validateColumns (O: Options, columns: any): Options {
        let currO = O;
        let AllColumns = Object.values(columns);
        if (AllColumns.length < 1) {
            throw new InsightError("columns must be non empty");
        }
        if (AllColumns[0].toString().includes("_")) {
            QueryHelper.dataSetToQuery = AllColumns[0].toString().substr(0, AllColumns[0].toString().indexOf("_"));
            let field = AllColumns[0].toString().split("_")[1];
            if (QueryHelper.RoomFields.includes(field)) {
                QueryHelper.UniversalFields = QueryHelper.RoomFields;
                QueryHelper.UniversalMFields = QueryHelper.RoomMFields;
                QueryHelper.UniversalSFields = QueryHelper.RoomSFields;
            } else if (QueryHelper.CourseFields.includes(field)) {
                QueryHelper.UniversalFields = QueryHelper.CourseFields;
                QueryHelper.UniversalMFields = QueryHelper.CourseMFields;
                QueryHelper.UniversalSFields = QueryHelper.CourseSFields;
            } else {
                throw new InsightError("invalid rooms or courses key");
            }
        } else {
            throw new InsightError("Invalid key");
        }
        for (let column of AllColumns) {
            if (QueryHelper.CheckForInvalidKey(column.toString(), QueryHelper.UniversalFields)) {
                throw new InsightError("invalid field");
            }
        }
        currO.COLUMNS = columns;
        return currO;
    }

    public static validateColumnsAndOrder (O: Options, columns: any, order: any): Options {
        let currO: Options;
        if (QueryHelper.ContainsTransformations) {
            currO = this.validateColumnsWithTransformations(O, columns);
        } else {
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
                throw new InsightError("ORDER key must be in COLUMNS");
            }
        } else {
            let numConfirmedOrderKeysInColumns: number = 0;
            let keyList: string[] = currO.ORDER.KEYS;
            keyList.forEach(function (obj) {
                if (currO.COLUMNS.includes(obj)) {
                    numConfirmedOrderKeysInColumns += 1;
                }
            });
            if (numConfirmedOrderKeysInColumns !== Object.keys(keyList).length) {
                throw new InsightError("ORDER keys must be in COLUMNS");
            }
        }
        return currO;
    }

    public static validateOrder(O: Order | string, order: any): Order | string {
        if (typeof order === "object") {
            if (QueryHelper.checkProperties(order, ["dir", "keys"])) {
                let outputOrder: Order = {
                    KEYS: [],
                    DIRECTION: "UP"
                };
                if ((order.dir === "UP") || (order.dir === "DOWN")) {
                    outputOrder.DIRECTION = order.dir;
                } else {
                    throw new InsightError("direction must be UP or DOWN");
                }
                if (Object.keys(order.keys).length > 0) {
                    outputOrder.KEYS = order.keys;
                } else {
                    throw new InsightError("ORDER keys must be non-empty array");
                }
                return outputOrder;
            } else {
                throw new InsightError("Order Object dir/keys error");
            }
        } else {
            return order.toString();
        }
    }
}
