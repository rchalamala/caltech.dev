export type Maybe<T> = T | null;

export interface CourseStorage {
  courseData: CourseData;
  sectionId: Maybe<number>;
  enabled: boolean;
  locked: boolean;
}

export interface CourseData {
  id: number;
  name: string;
  number: string;
  sections: SectionData[];
  units: number[];
  description: string;
  prerequisites: string;
  rating: string;
  true_units: string;
  link: string;
  comment: string;
}

export interface DateData {
  id: number;
  title: string;
  start: Date;
  end: Date;
  courseData: CourseData;
}

export interface SectionData {
  grades: string;
  instructor: string;
  locations: string;
  number: number;
  times: string;
}

export interface CourseStorageShort {
  courseId: number;
  sectionId: Maybe<number>;
  enabled: boolean;
  locked: boolean;
}

export type AvailableTimeRange = [Date, Date];
export type AvailableTimes = AvailableTimeRange[];

export interface Workspace {
  courses: CourseStorage[];
  arrangements: CourseStorageShort[][];
  arrangementIdx: Maybe<number>;
  availableTimes: AvailableTimes;
}

export type CourseIndex = Record<string, CourseData>;
