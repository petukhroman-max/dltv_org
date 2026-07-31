export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">DLTV Organizer Portal</p>
        <h1 id="page-title">Портал организаторов турниров</h1>
        <p className="description">
          Техническая основа готова. Инструменты подачи и управления турнирами
          появятся на следующих этапах.
        </p>
        <div className="status" role="status">
          <span className="statusDot" aria-hidden="true" />
          Application shell работает
        </div>
      </section>
    </main>
  );
}
