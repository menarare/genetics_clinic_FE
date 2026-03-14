import { useEffect, useRef, useState } from "react";
import "./Research.css";
import Loader from "../../components/Loader/Loader";
import ScrollLoader from "../../components/ScrollLoader/ScrollLoader";
import { useDocumentTitle } from "../../hooks/DocumentTItle";

const LIMIT = 20;

const Research = () => {
    useDocumentTitle("Research & Publications - Genetics UAE");
    const [papers, setPapers] = useState([]);
    const [page, setPage] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);

    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    const observer = useRef(null);
    const inFlight = useRef(false); // prevents double-fetch

    // Load metrics once
    useEffect(() => {
        const loadMetrics = async () => {
            try {
                setMetricsLoading(true);
                const res = await fetch("/api/scholar-metrics");
                const json = await res.json();
                if (res.ok && json) setMetrics(json);
            } catch (e) {
                console.error(e);
            } finally {
                setMetricsLoading(false);
            }
        };

        loadMetrics();
    }, []);

    // Load publications when page changes
    useEffect(() => {
        const fetchPublications = async () => {
            if (inFlight.current) return;
            if (!hasMore && page !== 0) return;

            inFlight.current = true;
            page === 0 ? setLoading(true) : setLoadingMore(true);

            try {
                const res = await fetch(`/api/pubmed?page=${page}&limit=${LIMIT}`);
                const json = await res.json();

                // Safety: never crash the UI if API fails
                if (!res.ok || !Array.isArray(json.data)) {
                    setError(json?.error || "Failed to load publications.");
                    setHasMore(false);
                    return;
                }

                setPapers((prev) => {
                    // avoid duplicates if observer fires twice
                    const seen = new Set(prev.map((p) => p.id));
                    const merged = [...prev];
                    for (const p of json.data) {
                        if (!seen.has(p.id)) merged.push(p);
                    }
                    return merged;
                });

                setHasMore(Boolean(json.hasMore));
            } catch (err) {
                console.error(err);
                setError("Failed to load publications.");
                setHasMore(false);
            } finally {
                setLoading(false);
                setLoadingMore(false);
                inFlight.current = false;
            }
        };

        fetchPublications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Cleanup observer on unmount
    useEffect(() => {
        return () => observer.current?.disconnect();
    }, []);

    const lastPaperRef = (node) => {
        if (!node) return;
        if (loading || loadingMore) return;
        if (!hasMore) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !inFlight.current && hasMore) {
                setPage((prev) => prev + 1);
            }
        });

        observer.current.observe(node);
    };

    if (loading && page === 0) return <Loader />;

    return (
        <div className="section">
            <div className="section-title">Research & Publications</div>

            {/* Metrics card */}
            <div className="metrics-card">
                {metricsLoading ? (
                    <div className="metrics-loading">
                        <ScrollLoader />
                    </div>
                ) : metrics ? (
                    <div className="metrics-grid">
                        <div className="metric">
                            <div className="metric-value">{metrics?.publications ?? 0}</div>
                            <div className="metric-label">Publications</div>
                        </div>
                        <div className="metric">
                            <div className="metric-value">{metrics?.totalCitations ?? 0}</div>
                            <div className="metric-label">Citations</div>
                        </div>
                        <div className="metric">
                            <div className="metric-value">{metrics?.hIndex ?? 0}</div>
                            <div className="metric-label">h-index</div>
                        </div>
                        <div className="metric">
                            <div className="metric-value">{metrics?.i10Index ?? 0}</div>
                            <div className="metric-label">i10-index</div>
                        </div>
                    </div>
                ) : (
                    <div className="metrics-fallback">Metrics unavailable</div>
                )}
            </div>

            <div className="research-container">
                {error && <p className="error">{error}</p>}

                {!error && papers.length === 0 && <p>No publications found.</p>}
                {papers.map((paper, index) => {
                    const isLast = index === papers.length - 1;

                    return (
                        <a href={paper.url} target="_blank" rel="noreferrer"
                            ref={isLast ? lastPaperRef : null}
                            className="publication-card"
                            key={paper.id}
                        >
                            <div className="publication-content">
                                <div className="publication-left">
                                    <h3 className="publication-title">
                                        <a href={paper.url} target="_blank" rel="noreferrer">
                                            {paper.title}
                                        </a>
                                    </h3>

                                    {paper.authors && (
                                        <p className="publication-details">
                                            Authors: <span className="publication-sub-content">{paper.authors}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="publication-details">
                                    Journal: <span className="publication-sub-content">{paper.source ? paper.source : "GeneReviews®"}</span>
                                </div>

                                {paper.publicationDate && (
                                    <div className="publication-details">
                                        Publication Date: <span className="publication-sub-content">{paper.publicationDate}</span>
                                    </div>
                                )}
                            </div>
                        </a>
                    );
                })}

                {loadingMore && <ScrollLoader />}

                {!loadingMore && !hasMore && papers.length > 0 && (
                    <p className="end-text">No more publications</p>
                )}
            </div>
        </div>
    );
};

export default Research;
