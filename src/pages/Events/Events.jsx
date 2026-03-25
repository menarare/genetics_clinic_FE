import { useEffect, useRef, useState } from "react";
import { sanityClient, urlFor } from "../../SanityClient";
import Loader from "../../components/Loader/Loader";
import { PortableText } from "@portabletext/react";
import "./Events.css";
import { useDocumentTitle } from "../../hooks/DocumentTItle";

const Events = () => {
    const [events, setEvents] = useState([]);
    const [activeIndex, setActiveIndex] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const thumbRefs = useRef({});
    const [modalImage, setModalImage] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [textModal, setTextModal] = useState(null);

    useDocumentTitle("Events - Genetics UAE");

    /* ================= ESC TO CLOSE MODAL ================= */
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") setModalImage(null);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, []);

    /* ================= FETCH EVENTS ================= */
    useEffect(() => {
        sanityClient
            .fetch(`
                *[_type == "events" && _id == "events"][0]{
                    events[]{
                        _key,
                        title,
                        date,
                        body,
                        images[]{ _key, asset }
                    }
                }
            `)
            .then((data) => {
                const evs = data?.events || [];
                setEvents(evs);

                const initialIndexes = {};
                evs.forEach((e) => {
                    initialIndexes[e._key] = 0;
                });

                setActiveIndex(initialIndexes);
                setIsLoading(false);
            })
            .catch(console.error);
    }, []);

    /* ================= ARROW HANDLERS ================= */
    const moveMedia = (eventKey, direction, images) => {
        setActiveIndex((prev) => {
            const current = prev[eventKey] ?? 0;
            const next =
                direction === "next"
                    ? Math.min(current + 1, images.length - 1)
                    : Math.max(current - 1, 0);

            // scroll active thumb into view
            const thumbEl = thumbRefs.current[`${eventKey}-${next}`];
            thumbEl?.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
            });

            return { ...prev, [eventKey]: next };
        });
    };

    const components = {
        marks: {
            link: ({ value, children }) => {
                const target = value?.href?.startsWith('http') ? '_blank' : '_self';

                return (
                    <a
                    href={value?.href}
                    target={target}
                    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                    >
                    {children}
                    </a>
                );
            },
        },
    };

    if (isLoading) return <Loader />;

    return (
        <div className="section">
            <div className="section-title">Events</div>

            <div className="events-container">
                {events.map((event) => {
                    const index = activeIndex[event._key] ?? 0;
                    const images = event.images || [];
                    const activeMedia = images[index];

                    return (
                        <div className="event" key={event._key}>
                            {/* ================= MEDIA ================= */}
                            <div className="event-medias">
                                <div className="active-event-media">
                                    {activeMedia && (
                                        <>
                                            <img
                                                src={urlFor(activeMedia)
                                                    .width(1400)
                                                    .quality(75)
                                                    .format("webp")
                                                    .url()}
                                                alt="event"
                                            />
                                            <button
                                                className="fullscreen-btn"
                                                onClick={() => {
                                                    setModalLoading(true);
                                                    setModalImage(activeMedia);
                                                }}
                                            >
                                                ⤢
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="event-medias-scroll-list">
                                    {/* LEFT */}
                                    <button
                                        className="media-arrow left"
                                        disabled={index === 0}
                                        onClick={() =>
                                            moveMedia(event._key, "prev", images)
                                        }
                                    >
                                        ‹
                                    </button>

                                    {/* THUMBNAILS */}
                                    <div className="media-list">
                                        {images.map((media, i) => (
                                            <div
                                                key={media._key}
                                                ref={(el) =>
                                                    (thumbRefs.current[
                                                        `${event._key}-${i}`
                                                    ] = el)
                                                }
                                                className={`media-thumb ${
                                                    i === index ? "active" : ""
                                                }`}
                                                onClick={() =>
                                                    setActiveIndex({
                                                        ...activeIndex,
                                                        [event._key]: i,
                                                    })
                                                }
                                            >
                                                <img
                                                    src={urlFor(media)
                                                        .width(220)
                                                        .quality(60)
                                                        .format("webp")
                                                        .url()}
                                                    alt="thumb"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* RIGHT */}
                                    <button
                                        className="media-arrow right"
                                        disabled={index === images.length - 1}
                                        onClick={() =>
                                            moveMedia(event._key, "next", images)
                                        }
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            {/* ================= DETAILS ================= */}
                            <div className="event-details">
                                <h3>{event.title}</h3>
                                {event.date && (
                                    <p className="event-date">
                                        {new Date(event.date).toLocaleDateString(
                                            "en-GB",
                                            {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            }
                                        )}
                                    </p>
                                )}
                                {event.body && (
                                    <div className="event-description-wrapper">
                                        <div className="event-description collapsed">
                                            <PortableText value={event.body} components={components} />
                                        </div>

                                        <button
                                            className="read-more-btn"
                                            onClick={() => setTextModal(event.body)}
                                        >
                                            Read more
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ================= MODAL ================= */}
            {modalImage && (
                <div
                    className="image-modal-overlay"
                    onClick={() => setModalImage(null)}
                >
                    <div
                        className="image-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {modalLoading && (
                            <div className="modal-loader">
                                <Loader />
                            </div>
                        )}
                        <img
                            src={urlFor(modalImage)
                                .width(2000)
                                .quality(85)
                                .format("webp")
                                .url()}
                            onLoad={() => setModalLoading(false)}
                            alt="fullscreen"
                        />
                        <button
                            className="modal-close"
                            onClick={() => setModalImage(null)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            {textModal && (
                <div
                    className="text-modal-overlay"
                    onClick={() => setTextModal(null)}
                >
                    <div
                        className="text-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            onClick={() => setTextModal(null)}
                        >
                            ✕
                        </button>

                        <div className="text-modal-body">
                            <PortableText value={textModal} components={components} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
