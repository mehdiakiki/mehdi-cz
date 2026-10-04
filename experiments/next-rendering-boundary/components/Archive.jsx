export default function Archive({ records }) {
  return (
    <ol className="archive" data-record-count={records.length}>
      {records.map((record) => (
        <li key={record.id}>
          <article data-record-id={record.id}>
            <h2>{record.title}</h2>
            <p>{record.body}</p>
            <a href={record.href}>Open record {record.id}</a>
            <span className="fingerprint"> {record.fingerprint}</span>
          </article>
        </li>
      ))}
    </ol>
  );
}
