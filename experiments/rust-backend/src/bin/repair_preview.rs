use rust_backend_labs::practical_repair::{apply, preview, RepairResult};
use std::io::{Read, Write};

#[tokio::main]
async fn main() -> RepairResult<()> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let pool = sqlx::PgPool::connect(&std::env::var("REPAIR_DATABASE_URL")?).await?;
    match args.as_slice() {
        [command,tenant] if command=="preview"=>std::io::stdout().write_all(&preview(&pool,tenant,10).await?)?,
        [command,file] if command=="apply"=>{
            let mut bytes=Vec::new();std::fs::File::open(file)?.take(8193).read_to_end(&mut bytes)?;
            println!("{}",serde_json::to_string(&apply(&pool,&bytes).await?)?);
        },
        _=>return Err("usage: repair_preview preview TENANT | apply PLAN_FILE; review the exact JSON bytes before applying".into()),
    }
    pool.close().await;
    Ok(())
}
