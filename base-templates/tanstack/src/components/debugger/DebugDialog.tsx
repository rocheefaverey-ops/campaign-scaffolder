import { useCallback, useEffect, useRef, useState } from 'react';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { DateTime } from 'luxon';
import styles from './DebugDialog.module.scss';
import type { IDeviceEntry } from '~/components/debugger/utils/DeviceDataHandler.ts';
import type { ILogEntry } from '~/components/debugger/utils/LogCaptureHandler.ts';
import { DeviceDataHandler } from '~/components/debugger/utils/DeviceDataHandler.ts';
import { LogCaptureHandler } from '~/components/debugger/utils/LogCaptureHandler.ts';
import { isProduction, mergeClasses } from '~/utils/Helper.ts';
import { LongPressHandler } from '~/components/debugger/utils/LongPressHandler.ts';

const longPressHandler = new LongPressHandler();
const logCaptureHandler = new LogCaptureHandler();
const deviceDataHandler = new DeviceDataHandler();

export function DebugDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [deviceEntries, setDeviceEntries] = useState<Array<IDeviceEntry>>([]);
  const [logs, setLogs] = useState<Array<ILogEntry>>([]);
  const [showLongPressPreview, setShowLongPressPreview] = useState(false);
  const longPressPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deviceDataHandler.init().then(() => setDeviceEntries(deviceDataHandler.getEntries()));
    logCaptureHandler.init();
    logCaptureHandler.setListener((data) => setLogs(data));

    // Setup long listener
    if (isProduction()) {
      longPressHandler.init();
      longPressHandler.setListener(() => setShowDialog(true));
    }

    // Set additional states
    setShowLongPressPreview(longPressHandler.showPreview);

    return () => {
      longPressHandler.destroy();
      logCaptureHandler.destroy();
      deviceDataHandler.destroy();
    };
  }, []);

  useEffect(() => {
    if (longPressPreviewRef.current) {
      longPressHandler.setPreview(longPressPreviewRef.current);
    }
  }, [showLongPressPreview]);

  const toggleLogExpand = useCallback((index: number) => {
    setLogs((prev) => prev.map((entry, i) =>
      i === index ? { ...entry, expanded: !entry.expanded } : entry
    ));
  }, []);

  return (
    <>
      {showLongPressPreview && <div ref={longPressPreviewRef} className={styles.longPressPreview} />}
      {!isProduction() &&
        <div className={styles.buttonDebug} onClick={() => setShowDialog(true)}>
          <img
            className={styles.buttonDebugIcon}
            src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBMaWNlbnNlOiBNSVQuIE1hZGUgYnkgdm13YXJlOiBodHRwczovL2dpdGh1Yi5jb20vdm13YXJlL2NsYXJpdHktYXNzZXRzIC0tPgo8c3ZnIGZpbGw9IiMwMDAwMDAiIHdpZHRoPSI4MDBweCIgaGVpZ2h0PSI4MDBweCIgdmlld0JveD0iMCAwIDM2IDM2IiB2ZXJzaW9uPSIxLjEiICBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KICAgIDx0aXRsZT5jb2RlLWxpbmU8L3RpdGxlPgogICAgPHBhdGggZD0iTTEzLjcxLDEyLjU5YTEsMSwwLDAsMC0xLjM5LS4yNkw1Ljc5LDE2Ljc4YTEsMSwwLDAsMCwwLDEuNjVsNi41Myw0LjQ1YTEsMSwwLDEsMCwxLjEzLTEuNjVMOC4xMywxNy42MSwxMy40NSwxNEExLDEsMCwwLDAsMTMuNzEsMTIuNTlaIiBjbGFzcz0iY2xyLWktb3V0bGluZSBjbHItaS1vdXRsaW5lLXBhdGgtMSI+PC9wYXRoPjxwYXRoIGQ9Ik0zMC4yMSwxNi43OGwtNi41My00LjQ1QTEsMSwwLDEsMCwyMi41NSwxNGw1LjMyLDMuNjMtNS4zMiwzLjYzYTEsMSwwLDAsMCwxLjEzLDEuNjVsNi41My00LjQ1YTEsMSwwLDAsMCwwLTEuNjVaIiBjbGFzcz0iY2xyLWktb3V0bGluZSBjbHItaS1vdXRsaW5lLXBhdGgtMiI+PC9wYXRoPjxwYXRoIGQ9Ik0xOS45NCw5LjgzYS45LjksMCwwLDAtMS4wOS42NkwxNS40MSwyNC4yOWEuOS45LDAsMCwwLC42NiwxLjA5bC4yMiwwYS45LjksMCwwLDAsLjg3LS42OGwzLjQ0LTEzLjgxQS45LjksMCwwLDAsMTkuOTQsOS44M1oiIGNsYXNzPSJjbHItaS1vdXRsaW5lIGNsci1pLW91dGxpbmUtcGF0aC0zIj48L3BhdGg+CiAgICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIGZpbGwtb3BhY2l0eT0iMCIvPgo8L3N2Zz4="
            alt="debug"
          />
        </div>
      }

      {showDialog &&
        <div className={styles.debuggerOverlay}>
          <div className={styles.debuggerDialog}>
            <div className={styles.debuggerContent}>
              <div className={styles.close} onClick={() => setShowDialog(false)}>close</div>

              <div className={styles.pageData}>
                <div className={styles.title}>Page</div>

                <div className={mergeClasses(styles.pageContainer, styles.container)}>
                  <div className={styles.pageEntry}>
                    <span className={styles.label}>Base URL:</span>
                    <a href={getFullUrl()} className={styles.data} target="_blank" rel="noreferrer">{getFullUrl()}</a>
                  </div>
                  <div className={styles.pageEntry}>
                    <span className={styles.label}>Environment:</span>
                    <span className={styles.data}>{import.meta.env.VITE_ENVIRONMENT}</span>
                  </div>
                  <div className={styles.pageEntry}>
                    <span className={styles.label}>DPR:</span>
                    <span className={styles.data}>{getDPR()}</span>
                  </div>
                </div>
              </div>

              <div className={styles.deviceData}>
                <div className={styles.title}>Device</div>

                {deviceEntries.length ?
                  <div className={mergeClasses(styles.deviceContainer, styles.container)}>
                    {deviceEntries.map((info, index) =>
                      <div key={index} className={styles.deviceEntry}>
                        <span className={styles.label}>{info.name}:</span>
                        <span className={styles.data}>{info.value}</span>
                      </div>
                    )}
                  </div>
                  :
                  <div className={styles.noData}>-</div>
                }
              </div>

              <div className={styles.logData}>
                <div className={styles.title}>Logs</div>

                {logs.length ?
                  <div className={mergeClasses(styles.logContainer, styles.container)}>

                    {logs.map((log, index) =>
                      <div key={index} className={mergeClasses(styles.logEntry, styles[log.type], log.expanded && styles.expanded)}>
                        <span className={styles.time}>[{formatTimestamp(log.timestamp)}]</span>
                        <span className={styles.message}>{log.message}</span>

                        {log.stack &&
                          <div className={styles.stack}>
                            <div className={styles.stackExpandToggle} onClick={() => toggleLogExpand(index)}>{log.expanded ? 'hide stack' : 'show stack'}</div>
                            {log.expanded && <div className={styles.stackData}>{log.stack}</div>}
                          </div>
                        }
                      </div>
                    )}
                  </div>
                  :
                  <div className={styles.noData}>-</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
}


// Utils
const getFullUrl = createIsomorphicFn()
  .server(() => {
    const req = getRequest();
    return req.url;
  })
  .client(() => {
    return window.location.href;
  });

const getDPR = createIsomorphicFn()
  .server(() => {
    return 0;
  })
  .client(() => {
    return window.devicePixelRatio || 1;
  });

function formatTimestamp(timestamp: number): string {
  return DateTime.fromMillis(timestamp).toFormat('HH:mm:ss');
}
