//Feeding chart actual scores now
//Displays five most recent dated, scored interviews, order chron.
//Bar color changes on score
const GRID_MARKS = [100, 75, 50, 25, 0];

function ProgressChart({ sessions = [] }) {
  if (!sessions.length) {
    return (
      <p className="analyticsMessage">
        No dated, scored interviews to chart yet.
      </p>
    );
  }

  return (
    <div className="progressChart">
      <div className="chartFrame">
        {/* Y-axis percentage labels */}
        <div className="chartYAxis" aria-hidden="true">
          {GRID_MARKS.map((mark) => (
            <span
              key={mark}
              className="chartYAxisLabel"
              style={{ top: `${100 - mark}%` }}
            >
              {mark}%
            </span>
          ))}
        </div>

        {/* Bounded graph area */}
        <div className="chartPlotArea">
          {/* Horizontal and vertical gridlines */}
          <div className="chartGrid" aria-hidden="true">
            {GRID_MARKS.slice(1, -1).map((mark) => (
              <div
                key={mark}
                className="chartGridLine"
                style={{ top: `${100 - mark}%` }}
              />
            ))}
          </div>

          {/* Actual interview scores */}
          <div className="chartContainer">
            {sessions.map((session, index) => {
              const date =
                session.completedAt.toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  }
                );

              const color =
                session.score >= 80
                  ? "#10b981"
                  : session.score >= 60
                  ? "#f59e0b"
                  : "#ef4444";

              return (
                <div
                  key={session.id || `${index}-${date}`}
                  className="chartColumn"
                >
                  <div className="chartBarContainer">
                    <div
                      className="chartBarFill"
                      role="img"
                      aria-label={
                        `${session.mode || "Interview"}: ${session.score}% on ${date}`
                      }
                      style={{
                        height: `${session.score}%`,
                        backgroundColor: color,
                      }}
                      title={
                        `${session.mode || "Interview"}: ${session.score}% on ${date}`
                      }
                    />
                  </div>

                  <div className="chartLabel">
                    {date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score legend */}
      <div className="chartLegend">
        <div className="legendItem">
          <div
            className="legendColor"
            style={{ backgroundColor: "#10b981" }}
          />
          <span>80%+</span>
        </div>

        <div className="legendItem">
          <div
            className="legendColor"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span>60–79%</span>
        </div>

        <div className="legendItem">
          <div
            className="legendColor"
            style={{ backgroundColor: "#ef4444" }}
          />
          <span>Below 60%</span>
        </div>
      </div>
    </div>
  );
}

export default ProgressChart;
