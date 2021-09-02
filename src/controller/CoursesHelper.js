"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const JSZip = require("jszip");
class CoursesHelper {
    static unZipCourses(id, content) {
        return new Promise((resolve, reject) => {
            try {
                let AllCourseSections = [];
                let zip = new JSZip();
                return zip.loadAsync(content, { base64: true })
                    .then((result) => {
                    let zipFiles = Object.keys(result["files"]);
                    let ZipCollection = [];
                    result.folder("courses").forEach((relativePath, file) => {
                        ZipCollection.push(file.async("string"));
                    });
                    return Promise.all(ZipCollection)
                        .then((fileContent) => {
                        for (let file of fileContent) {
                            AllCourseSections = AllCourseSections.concat(this.parseJSON(file, id));
                        }
                        AllCourseSections = this.ProcessCourseSectionList(AllCourseSections);
                        fs.writeFileSync("./data/" + id + ".json", JSON.stringify(AllCourseSections, null, 4));
                        if (AllCourseSections.length === 1 || AllCourseSections.length === 0) {
                            reject("empty courses");
                        }
                        resolve(AllCourseSections);
                    }).catch((error) => {
                        reject("error");
                    });
                }).catch((error) => {
                    reject("error while using jszip");
                });
            }
            catch (error) {
                reject("error while using jszip");
            }
        });
    }
    static parseJSON(file, id) {
        let sectionsOfCurrent = [];
        if (this.isJson(file)) {
            let current = JSON.parse(file);
            if (current.result.length > 0) {
                for (let currSection of current.result) {
                    if (("Course" in currSection) &&
                        ("Subject" in currSection) &&
                        ("Professor" in currSection) &&
                        ("Title" in currSection) &&
                        ("id" in currSection) &&
                        ("Avg" in currSection) &&
                        ("Pass" in currSection) &&
                        ("Fail" in currSection) &&
                        ("Audit" in currSection) &&
                        ("Year" in currSection)) {
                        let validSection = {
                            dataset_id: id,
                            id: currSection.Course.toString(),
                            dept: currSection.Subject.toString(),
                            instructor: currSection.Professor.toString(),
                            title: currSection.Title.toString(),
                            uuid: currSection.id.toString(),
                            avg: Number(currSection.Avg),
                            pass: Number(currSection.Pass),
                            fail: Number(currSection.Fail),
                            audit: Number(currSection.Audit),
                            year: Number(currSection.Year),
                        };
                        sectionsOfCurrent.push(validSection);
                    }
                }
                return sectionsOfCurrent;
            }
        }
    }
    static isJson(json) {
        try {
            JSON.parse(json);
        }
        catch (error) {
            return false;
        }
        return true;
    }
    static ProcessCourseSectionList(courseList) {
        let processedList = [];
        for (let course of courseList) {
            if (course) {
                processedList.push(course);
            }
        }
        return processedList;
    }
}
exports.default = CoursesHelper;
//# sourceMappingURL=CoursesHelper.js.map