import { LazyMotion, domAnimation } from "motion/react";
import Planner from "./Planner";
import Workspace from "./Workspace";
import HelpButton from "./HelpButton";
import Hyperlink from "./Hyperlink";
import { AllCourses, AppState } from "./appContext";
import { useAppState } from "./useAppState";

/** Main wrapper */
function App() {
  const { realPath, indexedCourses, appStateValue } = useAppState();

  return (
    <AllCourses.Provider value={indexedCourses}>
      <AppState.Provider value={appStateValue}>
        <LazyMotion features={domAnimation} strict>
          <HelpButton />

          <main className="py-5 mx-2 antialiased scroll-smooth selection:bg-orange-400 selection:text-black">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1">
                <Planner />
              </div>
              <Workspace term={realPath.substring(1)} />
            </div>
          </main>

          <footer className="m-auto flex flex-col justify-center gap-y-[10px] py-[30px]">
            <p className="text-center">
              Made with ❤️ by{" "}
              <Hyperlink href="https://github.com/rchalamala" text="Rahul" />,{" "}
              <Hyperlink href="https://github.com/ericlovesmath" text="Eric" />,
              & <Hyperlink href="https://github.com/zack466" text="Zack" />
            </p>
            <p className="text-center">Current term: {realPath.substring(1)}</p>
          </footer>
        </LazyMotion>
      </AppState.Provider>
    </AllCourses.Provider>
  );
}

export default App;
