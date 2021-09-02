import {InsightError, NotFoundError,
    CourseSection, Dataset, MComparison, SComparison} from "./IInsightFacade";
import {Query, Where, Options, Columns, Order,
    IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import * as fs from "fs-extra";
import * as JSZip from "jszip";
import * as IF from "./InsightFacade";
import InsightFacade from "./InsightFacade";
import { isArray } from "util";
import Log from "../Util";

export default class CoursesHelper {
    public static unZipCourses(id: string, content: string): Promise<any> {
        return  new Promise<CourseSection[]>((resolve, reject) => {
            try {
                let AllCourseSections: CourseSection[] = [];
                let zip = new JSZip();
                return zip.loadAsync(content, {base64: true})
                    .then((result) => {
                        let zipFiles = Object.keys(result["files"]);
                        let ZipCollection: Array<Promise<any>> = [];
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
            } catch (error) {
                reject("error while using jszip");
            }
        });
    }

    public static parseJSON(file: any, id: string): any {
        let sectionsOfCurrent: CourseSection[] = [];
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
                            let validSection: CourseSection = {
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

    public static isJson(json: any): any {
        try {
            JSON.parse(json);
        } catch (error) {
            // return Promise.reject(new InsightError("error"));
            return false;
        }
        return true;
    }

    public static ProcessCourseSectionList(courseList: CourseSection[]): CourseSection[] {
        let processedList: CourseSection[] = [];
        for (let course of courseList) {
            if (course) {
                processedList.push(course);
            }
        }
        return processedList;
    }
}
