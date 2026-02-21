import React, { useState, useEffect } from "react";
import styles from "./Modal.module.css";
import api from "../Datafetching/api";
import { X, Loader, Star, Send } from "lucide-react";

const MentorModel = ({ isOpen, onClose, userId, incuserid }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestingId, setRequestingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMentors = async () => {
      if (!isOpen || !userId) return;
      setLoading(true);
      setError("");
      try {
        const response = await api.post(
          "resources/generic/getmentorbyincubatee",
          { userId, userIncId: Number(incuserid) },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.data.statusCode === 200) {
          setMentors(response.data.data || []);
        } else {
          setError(response.data.message || "Failed to fetch mentors");
        }
      } catch (err) {
        if (err.name === "CanceledError") return;
        setError(
          err.response?.data?.message || "Network error: " + err.message,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchMentors();
    return () => controller.abort();
  }, [isOpen, userId, incuserid]);

  const handleRequest = async (mentor) => {
    setRequestingId(mentor.mentordetsid);
    try {
      // await api.post("resources/generic/requestmentor", { mentorId: mentor.mentordetsid, userId });
      await new Promise((res) => setTimeout(res, 1000));
      alert(`Request sent to ${mentor.mentordetsname}!`);
    } catch {
      alert("Failed to send request. Please try again.");
    } finally {
      setRequestingId(null);
    }
  };

  if (!isOpen) return null;

  const activeMentors = mentors.filter((m) => m.assigned_status === 1);
  const inactiveMentors = mentors.filter((m) => m.assigned_status === 0);

  const DetailItem = ({ label, value }) => (
    <div className={styles.detailItem}>
      <p className={styles.detailLabel}>{label}</p>
      <p className={styles.detailValue}>{value}</p>
    </div>
  );

  const MentorCard = ({ mentor, isActive }) => (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      {isActive && (
        <span className={styles.activeBadge}>
          <Star size={10} fill="white" /> Active
        </span>
      )}

      <div className={styles.mentorHeader}>
        <div
          className={`${styles.avatar} ${isActive ? styles.avatarActive : styles.avatarAvailable}`}
        >
          {mentor.mentordetsname?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className={styles.mentorName}>{mentor.mentordetsname}</p>
          <p className={styles.mentorDesignation}>{mentor.mentordetsdesign}</p>
        </div>
      </div>

      <div
        className={`${styles.detailsGrid} ${isActive ? styles.detailsGridNoMargin : ""}`}
      >
        <DetailItem label="Type" value={mentor.mentortypename} />
        <DetailItem label="Domain" value={mentor.mentordetsdomain} />
        <DetailItem label="Class" value={mentor.mentorclassetname || "—"} />
        <DetailItem label="Experience" value={mentor.mentordetspastexp} />
        {mentor.mentordetsgender && (
          <DetailItem label="Gender" value={mentor.mentordetsgender} />
        )}
      </div>

      {!isActive && (
        <button
          className={styles.requestButton}
          onClick={() => handleRequest(mentor)}
          disabled={requestingId === mentor.mentordetsid}
        >
          {requestingId === mentor.mentordetsid ? (
            <>
              <Loader size={14} className={styles.spinner} /> Requesting...
            </>
          ) : (
            <>
              <Send size={14} /> Request Mentor
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Mentors</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader className={styles.spinner} size={32} />
              <p>Loading mentors...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{error}</p>
            </div>
          ) : mentors.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No mentors available</p>
            </div>
          ) : (
            <>
              {activeMentors.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div
                      className={`${styles.sectionAccent} ${styles.sectionAccentActive}`}
                    />
                    <h3
                      className={`${styles.sectionTitle} ${styles.sectionTitleActive}`}
                    >
                      My Mentor ({activeMentors.length})
                    </h3>
                  </div>
                  {activeMentors.map((m) => (
                    <MentorCard
                      key={m.mentordetsid}
                      mentor={m}
                      isActive={true}
                    />
                  ))}
                </div>
              )}

              {inactiveMentors.length > 0 && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div
                      className={`${styles.sectionAccent} ${styles.sectionAccentAvailable}`}
                    />
                    <h3
                      className={`${styles.sectionTitle} ${styles.sectionTitleAvailable}`}
                    >
                      Available Mentors ({inactiveMentors.length})
                    </h3>
                  </div>
                  {inactiveMentors.map((m) => (
                    <MentorCard
                      key={m.mentordetsid}
                      mentor={m}
                      isActive={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorModel;
