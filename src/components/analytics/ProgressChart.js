const GRID_MARKS = [100, 75, 50, 25, 0];

function ProgressChart({ days = [] }) {
  return (
    <div className="progressChart">
      <div className="chartFrame">
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

        <div
          className="chartViewport"
          aria-label="Daily averages for the last 30 days"
        >
          <div
            className="chartPlotArea"
            style={{ minWidth: "1140px" }}
          >
            <div className="chartGrid" aria-hidden="true">
              {GRID_MARKS.slice(1, -1).map((mark) => (
                <div
                  key={mark}
                  className="chartGridLine"
                  style={{ top: `${100 - mark}%` }}
                />
              ))}
            </div>

            <div className="chartContainer">
              {days.map(({ date, count, averageScore }) => {
                const dateLabel = date.toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  }
                );

                const missing = count === 0;

                const description = missing
                  ? `${dateLabel}: No scored interviews`
                  : `${dateLabel}: ${averageScore}% daily average across ${count} ${
                      count === 1
                        ? "interview"
                        : "interviews"
                    }`;

                const color =
                  averageScore >= 80
                    ? "#10b981"
                    : averageScore >= 60
                    ? "#f59e0b"
                    : "#ef4444";

                return (
                  <div
                    key={date.toISOString()}
                    className={`chartColumn${
                      missing ? " chartColumn--empty" : ""
                    }`}
                    role="img"
                    aria-label={description}
                    title={description}
                  >
                    <div className="chartBarContainer">
                      {missing ? (
                        <div
                          className="chartBarNoData"
                          aria-hidden="true"
                        />
                      ) : (
                        <div
                          className="chartBarFill"
                          aria-hidden="true"
                          style={{
                            height: `${averageScore}%`,
                            minHeight:
                              averageScore === 0
                                ? "4px"
                                : undefined,
                            backgroundColor: color,
                          }}
                        />
                      )}
                    </div>

                    <div className="chartLabel">
                      {dateLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="chartLegend">
        <div className="legendItem">
          <span
            className="legendColor"
            style={{ backgroundColor: "#10b981" }}
          />
          80%+
        </div>

        <div className="legendItem">
          <span
            className="legendColor"
            style={{ backgroundColor: "#f59e0b" }}
          />
          60–79%
        </div>

        <div className="legendItem">
          <span
            className="legendColor"
            style={{ backgroundColor: "#ef4444" }}
          />
          Below 60%
        </div>

        <div className="legendItem">
          <span
            className="legendColor"
            style={{ backgroundColor: "#9ca3af" }}
          />
          No data
        </div>
      </div>
    </div>
  );
}

export default ProgressChart;
