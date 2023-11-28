import { useRef, useState } from "react";
import ImageUpload from "./components/ImageUpload";
import CodePreview from "./components/CodePreview";
import Preview from "./components/Preview";
import { CodeGenerationParams, generateCode } from "./generateCode";
import Spinner from "./components/Spinner";
import classNames from "classnames";
import {
  FaCode,
  FaDesktop,
  FaDownload,
  FaMobile,
  FaUndo,
} from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import SettingsDialog from "./components/SettingsDialog";
import { Settings, EditorTheme, AppState } from "./types";
import { OnboardingNote } from "./components/OnboardingNote";
import { usePersistedState } from "./hooks/usePersistedState";
import html2canvas from "html2canvas";
import { USER_CLOSE_WEB_SOCKET_CODE } from "./constants";
import CodeTab from "./components/CodeTab";
import Header from "@/components/Header";

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [executionConsole, setExecutionConsole] = useState<string[]>([]);
  const [updateInstruction, setUpdateInstruction] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [settings, setSettings] = usePersistedState<Settings>(
    {
      openAiApiKey: null,
      screenshotOneApiKey: null,
      isImageGenerationEnabled: true,
      editorTheme: EditorTheme.COBALT,
      isTermOfServiceAccepted: false,
    },
    "setting"
  );
  const [shouldIncludeResultImage] =
    useState<boolean>(false);
  const wsRef = useRef<WebSocket>(null);

  const takeScreenshot = async (): Promise<string> => {
    const iframeElement = document.querySelector(
      "#preview-desktop"
    ) as HTMLIFrameElement;
    if (!iframeElement?.contentWindow?.document.body) {
      return "";
    }

    const canvas = await html2canvas(iframeElement.contentWindow.document.body);
    const png = canvas.toDataURL("image/png");
    return png;
  };

  const downloadCode = () => {
    // Create a blob from the generated code
    const blob = new Blob([generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Create an anchor element and set properties for download
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html"; // Set the file name for download
    document.body.appendChild(a); // Append to the document
    a.click(); // Programmatically click the anchor to trigger download

    // Clean up by removing the anchor and revoking the Blob URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setAppState(AppState.INITIAL);
    setGeneratedCode("");
    setReferenceImages([]);
    setExecutionConsole([]);
    setHistory([]);
  };

  const stop = () => {
    wsRef.current?.close?.(USER_CLOSE_WEB_SOCKET_CODE);
    // make sure stop can correct the state even if the websocket is already closed
    setAppState(AppState.CODE_READY);
  };

  function doGenerateCode(params: CodeGenerationParams) {
    setExecutionConsole([]);
    setAppState(AppState.CODING);

    // Merge settings with params
    const updatedParams = { ...params, ...settings };

    generateCode(
      wsRef,
      updatedParams,
      (token) => setGeneratedCode((prev) => prev + token),
      (code) => setGeneratedCode(code),
      (line) => setExecutionConsole((prev) => [...prev, line]),
      () => setAppState(AppState.CODE_READY)
    );
  }

  // Initial version creation
  function doCreate(referenceImages: string[]) {
    // Reset any existing state
    reset();

    setReferenceImages(referenceImages);
    if (referenceImages.length > 0) {
      doGenerateCode({
        generationType: "create",
        image: referenceImages[0],
      });
    }
  }

  // Subsequent updates
  async function doUpdate() {
    const updatedHistory = [...history, generatedCode, updateInstruction];
    if (shouldIncludeResultImage) {
      const resultImage = await takeScreenshot();
      doGenerateCode({
        generationType: "update",
        image: referenceImages[0],
        resultImage: resultImage,
        history: updatedHistory,
      });
    } else {
      doGenerateCode({
        generationType: "update",
        image: referenceImages[0],
        history: updatedHistory,
      });
    }

    setHistory(updatedHistory);
    setGeneratedCode("");
    setUpdateInstruction("");
  }

  return (
      <div>
        <Header />
        <h1 className="text-2xl w-full text-center">Screenshot to HTML</h1>
        <div className="mt-2">
          <div className="container px-12">
              <div className="w-full text-center">
                <SettingsDialog settings={settings} setSettings={setSettings} />

          {!settings.openAiApiKey && <OnboardingNote />}

          {(appState === AppState.CODING ||
            appState === AppState.CODE_READY) && (
            <>
              {/* Show code preview only when coding */}
              {appState === AppState.CODING && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-x-1">
                    <Spinner />
                    {executionConsole.slice(-1)[0]}
                  </div>
                  <div className="flex mt-4 w-full">
                    <Button onClick={stop} className="w-full">
                      Stop
                    </Button>
                  </div>
                  <div className="flex mt-4 w-full">
                    <CodePreview code={generatedCode} />
                  </div>
                </div>
              )}

              {appState === AppState.CODE_READY && (
                <div>
                  <div className="grid w-full gap-2">
                    <Textarea
                      placeholder="Tell the AI what to change..."
                      onChange={(e) => setUpdateInstruction(e.target.value)}
                      value={updateInstruction}
                    />
                    <Button onClick={doUpdate}>Update</Button>
                  </div>
                  <div className="flex items-center gap-x-2 mt-2">
                    <Button
                      onClick={downloadCode}
                      className="flex items-center gap-x-2"
                    >
                      <FaDownload /> Download
                    </Button>
                    <Button
                      onClick={reset}
                      className="flex items-center gap-x-2"
                    >
                      <FaUndo />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Reference image display */}
              <div className="flex gap-x-2 mt-2">
                <div className="flex flex-col">
                  <div
                    className={classNames({
                      "scanning relative": appState === AppState.CODING,
                    })}
                  >
                    <img
                      className="w-[340px] border border-gray-200 rounded-md"
                      src={referenceImages[0]}
                      alt="Reference"
                    />
                  </div>
                  <div className="text-gray-400 uppercase text-sm text-center mt-1">
                    Original Screenshot
                  </div>
                </div>
                <div className="bg-gray-400 px-4 py-2 rounded text-sm hidden">
                  <h2 className="text-lg mb-4 border-b border-gray-800">
                    Console
                  </h2>
                  {executionConsole.map((line, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-400 mb-2 text-gray-600 font-mono"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <main className="flex-col grow flex">
        {appState === AppState.INITIAL && (
          <div className="flex flex-col justify-center items-center gap-y-10">
            <ImageUpload setReferenceImages={doCreate} />
          </div>
        )}

        {(appState === AppState.CODING || appState === AppState.CODE_READY) && (
          <div className="ml-4">
            <Tabs defaultValue="desktop">
              <div className="flex justify-end mr-8 mb-4">
                <TabsList>
                  <TabsTrigger value="desktop" className="flex gap-x-2">
                    <FaDesktop /> Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex gap-x-2">
                    <FaMobile /> Mobile
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex gap-x-2">
                    <FaCode />
                    Code
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="desktop">
                <Preview code={generatedCode} device="desktop" />
              </TabsContent>
              <TabsContent value="mobile">
                <Preview code={generatedCode} device="mobile" />
              </TabsContent>
              <TabsContent value="code">
                <CodeTab
                  code={generatedCode}
                  setCode={setGeneratedCode}
                  settings={settings}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
      </div>
  );
}

export default App;
