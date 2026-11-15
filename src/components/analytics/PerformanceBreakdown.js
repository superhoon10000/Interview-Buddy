//Replaced mock information with actual stats

function PerformanceBreakdown({
  byMode = [],
  strongestMode,
  improvementMode,
}) {
  const activeModes = byMode.filter(
    (entry) => entry.sessions > 0
  );

  if (!activeModes.length) {
    return (
      <p className="analyticsMessage">
        Complete a scored interview to see
        performance by mode.
      </p>
    );
  }

  return (
    <div className="performanceBreakdown">
      <div className="breakdownSection">
        <h3>Performance by Mode</h3>

        <div className="modeBreakdownGrid">
          {activeModes.map(
            ({
              mode,
              sessions,
              averageScore,
              bestScore,
            }) => (
              <div
                key={mode}
                className="modeBreakdownCard"
              >
                <h4>{mode}</h4>

                <div className="modeStats">
                  <div className="stat">
                    <span className="statLabel">
                      Scored sessions:
                    </span>
                    <span className="statValue">
                      {sessions}
                    </span>
                  </div>

                  <div className="stat">
                    <span className="statLabel">
                      Avg Score:
                    </span>
                    <span className="statValue">
                      {averageScore}%
                    </span>
                  </div>

                  <div className="stat">
                    <span className="statLabel">
                      Best Score:
                    </span>
                    <span className="statValue">
                      {bestScore}%
                    </span>
                  </div>
                </div>

                <div
                  className="performanceBar"
                  role="img"
                  aria-label={
                    `${mode} average: ${averageScore}%`
                  }
                >
                  <div
                    className="performanceFill"
                    style={{
                      width: `${averageScore}%`,
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="breakdownSection">
        <h3>Mode Insights</h3>

        <div className="trendAnalysis">
          <p>
            <strong>Strongest Mode:</strong>{" "}
            {strongestMode || "Not available"}
          </p>

          <p>
            <strong>Potential Improvement:</strong>{" "}
            {improvementMode ||
              "Try another mode to compare."}
          </p>

          <p>
            Mode comparisons use the average saved
            score for fully completed interviews.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PerformanceBreakdown;
