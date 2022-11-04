type Maybe<T> = T | null;

interface CourseStorage {
  courseData: CourseData;
  sectionId: Maybe<number>;
  enabled: boolean;
  locked: boolean;
}

interface CourseData {
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
}

interface DateData {
  id: number;
  title: string;
  start: Date;
  end: Date;
  courseData: CourseData;
}

interface SectionData {
  grades: string;
  instructor: string;
  locations: string;
  number: number;
  times: string;
}

interface CourseStorageShort {
  courseId: number;
  sectionId: Maybe<number>;
  enabled: boolean;
  locked: boolean;
}

type AvailableTimes = Date[][];

// the overall state of a single workspace
interface Workspace {
  courses: CourseStorage[];
  arrangements: CourseStorageShort[][];
  arrangementIdx: Maybe<number>;
  availableTimes: AvailableTimes;
}

type CourseIndex = Record<string, CourseData>
