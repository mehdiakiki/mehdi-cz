use sql_rust_enterprise_examples::{fixture_permission, invalid, sqlserver, AnyResult};
use tiberius::xml::XmlData;
async fn run() -> AnyResult<()> {
    fixture_permission()?;
    let mut client = sqlserver().await?;
    let settings = client
        .query(
            "SELECT CAST(compatibility_level AS int) AS level FROM sys.databases WHERE database_id=DB_ID()",
            &[],
        )
        .await?
        .into_row()
        .await?
        .ok_or_else(|| invalid("no compatibility setting"))?;
    let level = settings
        .try_get::<i32, _>(0)?
        .ok_or_else(|| invalid("null compatibility level"))?;
    println!("database compatibility level={level}");
    client.execute("CREATE TABLE #PlanProbe (id int PRIMARY KEY, tenant int NOT NULL, payload varchar(100) NOT NULL); CREATE INDEX IX_tenant ON #PlanProbe(tenant)", &[]).await?;
    client.execute("WITH n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i<2000) INSERT INTO #PlanProbe SELECT i, CASE WHEN i=1 THEN 1 ELSE 2 END, REPLICATE('x',100) FROM n OPTION(MAXRECURSION 2000)", &[]).await?;
    client
        .simple_query("SET STATISTICS XML ON")
        .await?
        .into_results()
        .await?;
    let directory = std::path::PathBuf::from(std::env::var("SQLSERVER_PLAN_DIR")?);
    std::fs::create_dir_all(&directory)?;
    capture(&mut client, &directory).await?;
    client
        .simple_query("SET STATISTICS XML OFF")
        .await?
        .into_results()
        .await?;
    Ok(())
}
// article-example: plans
async fn capture(
    client: &mut sql_rust_enterprise_examples::SqlClient,
    directory: &std::path::Path,
) -> AnyResult<()> {
    for (attempt, tenant) in [1i32, 2, 1].into_iter().enumerate() {
        let results = client.query(
            "SELECT COUNT_BIG(*) AS matched, SUM(CONVERT(bigint,DATALENGTH(payload))) AS bytes FROM #PlanProbe WHERE tenant=@P1 /* rust-plan-probe */",
            &[&tenant],
        ).await?.into_results().await?;
        let actual = results
            .first()
            .and_then(|set| set.first())
            .ok_or_else(|| invalid("missing count"))?
            .try_get::<i64, _>("matched")?;
        assert_eq!(actual, Some(if tenant == 1 { 1 } else { 1999 }));
        let mut plans = 0;
        for rows in &results {
            for row in rows {
                let text = if let Ok(Some(text)) = row.try_get::<&str, _>(0) {
                    Some(text)
                } else {
                    row.try_get::<&XmlData, _>(0)
                        .ok()
                        .flatten()
                        .map(|xml| xml.as_ref())
                };
                if let Some(text) = text {
                    if text.len() > 2_000_000 {
                        return Err(invalid("unexpectedly large plan").into());
                    }
                    std::fs::write(
                        directory.join(format!(
                            "attempt-{attempt}-tenant-{tenant}-plan-{plans}.sqlplan"
                        )),
                        text,
                    )?;
                    plans += 1;
                }
            }
        }
        if plans == 0 {
            return Err(invalid("no actual plan returned; check SHOWPLAN permission").into());
        }
        println!("attempt={attempt}, tenant={tenant}, rows={actual:?}, plans={plans}");
    }
    Ok(())
}
// end-article-example
#[tokio::main(flavor = "current_thread")]
async fn main() -> AnyResult<()> {
    tokio::time::timeout(std::time::Duration::from_secs(30), run()).await?
}
