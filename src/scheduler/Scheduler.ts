import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

export default class Scheduler implements IScheduler {
    public allTimeSlots: TimeSlot[] =
        ["MWF 0800-0900" , "MWF 0900-1000" , "MWF 1000-1100" ,
        "MWF 1100-1200" , "MWF 1200-1300" , "MWF 1300-1400" ,
        "MWF 1400-1500" , "MWF 1500-1600" , "MWF 1600-1700" ,
        "TR  0800-0930" , "TR  0930-1100" , "TR  1100-1230" ,
        "TR  1230-1400" , "TR  1400-1530" , "TR  1530-1700"];
    // public allTimeSlots: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000"];

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        let currSections: SchedSection[] = sections;
        let currRooms: SchedRoom[] = rooms;
        currSections = this.sortSections(currSections);
        currRooms = this.sortRooms(currRooms);
        let roomTimeCombos: Array<[SchedRoom, TimeSlot]> = [];
        for (let room of currRooms) {
            for (let timeslot of this.allTimeSlots) {
                roomTimeCombos.push([room, timeslot]);
            }
        }
        for (let section of currSections) {
            for (let rtc of roomTimeCombos) {
                if ((this.sumSectionMembers(section) <= rtc[0].rooms_seats) &&
                (!this.overlappingTimeslot(section, rtc[1], finalSchedule))) {
                    finalSchedule.push([rtc[0], section, rtc[1]]);
                    roomTimeCombos.splice(roomTimeCombos.indexOf(rtc), 1);
                    break;
                }
            }
        }
        let distanceList = this.findLargestDistance(finalSchedule);
        finalSchedule = this.minimizeDistances(finalSchedule, roomTimeCombos,
            distanceList[0], distanceList[1], distanceList[2]);
        // 1. find largest distance between two rooms,
        // 2. then try to find a room with adequate size and is closer and is not taken.
        // 3. if closer building exists, switch it (remember to add buildingtimeCombo to list as we make switch)
        // 4. then find next largest distance and continue return to step 2.
        // 5. if does not exist, exit
        return finalSchedule;
    }

    private minimizeDistances(finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]>,
                              roomTimeCombos: Array<[SchedRoom, TimeSlot]>,
                              maxDistance: number,
                              IndexI: number,
                              IndexJ: number): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let minDistance = maxDistance;
        let startingDistance = maxDistance;
        let minDistanceIndex = 0;
        for (let rtc of roomTimeCombos) {
            let currDistance = this.calculateDistance(finalSchedule[IndexI][0], rtc[0]);
            // Log.info("currDistance", currDistance);
            // Log.info("minDistance", minDistance);
            // Log.info("section", finalSchedule[IndexI][1]);
            // Log.info("room", roomTimeCombo[0]);
            if ((currDistance < minDistance) &&
                (this.sumSectionMembers(finalSchedule[IndexI][1]) <= rtc[0].rooms_seats) &&
            (!this.overlappingTimeslot(finalSchedule[IndexJ][1], rtc[1], finalSchedule))) {
                minDistance = currDistance;
                minDistanceIndex = roomTimeCombos.indexOf(rtc);
            }
        }
        if (startingDistance > minDistance) {
            let extractedRoomTimeCombo = roomTimeCombos[minDistanceIndex];
            roomTimeCombos[minDistanceIndex] = [finalSchedule[IndexJ][0], finalSchedule[IndexJ][2]];
            finalSchedule[IndexJ][0] = extractedRoomTimeCombo[0];
            finalSchedule[IndexJ][2] = extractedRoomTimeCombo[1];
            let distanceList = this.findLargestDistance(finalSchedule);
            return this.minimizeDistances(finalSchedule, roomTimeCombos,
                distanceList[0], distanceList[1], distanceList[2]);
        } else {
            return finalSchedule;
        }
    }

    private findLargestDistance(schedule: Array<[SchedRoom, SchedSection, TimeSlot]> ): number[] {
        let maxDistance = 0;
        let indexI: number = 0;
        let indexJ: number = 0;
        for (let i in schedule) {
            for (let j in schedule) {
                let currDistance = this.calculateDistance(schedule[i][0], schedule[j][0]);
                if (currDistance > maxDistance) {
                    maxDistance = currDistance;
                    indexI = Number(i);
                    indexJ = Number(j);
                }
            }
        }
        return [maxDistance, indexI, indexJ];
    }

    private overlappingTimeslot(course: SchedSection, timeslot: TimeSlot,
                                finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]>): boolean {
        for (let curr of finalSchedule) {
            if ((curr[1].courses_dept === course.courses_dept) &&
                (curr[1].courses_id === course.courses_id) &&
                (curr[2] === timeslot)) {
                return true;
            }
        }
        return false;
    }

    private sortRooms(rooms: SchedRoom[]): SchedRoom[] {
        let currRooms = rooms;
        currRooms.sort((a, b) => {
            if (a.rooms_seats > b.rooms_seats) {
                return -1;
            } else if (a.rooms_seats < b.rooms_seats) {
                return 1;
            } else {
                return 0;
            }
        });
        return currRooms;
    }

    public sortSections(sections: SchedSection[]): SchedSection[] {
        let currSections = sections;
        currSections.sort((a, b) => {
            if (this.sumSectionMembers(a) > this.sumSectionMembers(b)) {
                return -1;
            } else if (this.sumSectionMembers(a) < this.sumSectionMembers(b)) {
                return 1;
            } else {
                return 0;
            }
        });
        return currSections;
    }

    public sumSectionMembers(section: SchedSection): number {
        return section.courses_audit + section.courses_pass + section.courses_fail;
    }

    // haversine formula from C3 Specs
    public calculateDistance(room1: SchedRoom, room2: SchedRoom): number {
        let lon1: number = room1.rooms_lon;
        let lat1: number = room1.rooms_lat;
        let lon2: number = room2.rooms_lon;
        let lat2: number = room2.rooms_lat;
        let R = 6371e3; // metres
        let φ1 = lat1 * (Math.PI / 180);
        let φ2 = lat2 * (Math.PI / 180);
        let Δφ = (lat2 - lat1) * (Math.PI / 180);
        let Δλ = (lon2 - lon1) * (Math.PI / 180);

        let a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
