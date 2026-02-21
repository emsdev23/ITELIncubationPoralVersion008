import React, { useState, useEffect, useContext, useRef } from "react";
import "./MentorDashboard.css";
import EditMentorModal from "./EditMentorModal";
import api from "../Datafetching/api";
import { DataContext } from "../Datafetching/DataProvider";
import { CircleFadingPlus, Camera } from "lucide-react";
import Swal from "sweetalert2";

const MentorDashboard = () => {
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingMentor, setUpdatingMentor] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const { roleid, userid, incuserid } = useContext(DataContext);
  const fileInputRef = useRef(null);

  // Fetch mentors from API using your API format
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true);
        const response = await api.post(
          "/resources/generic/getmentordetails",
          {
            userId: userid,
            incUserId: incuserid,
          },
          {
            headers: {
              userid: userid,
            },
          },
        );

        if (response.data.statusCode === 200) {
          setMentors(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedMentor(response.data.data[0]);
          }
        } else {
          setError("Failed to fetch mentors");
        }
      } catch (err) {
        setError("Error fetching mentor data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, [userid, incuserid]);

  // Fetch profile image URL when selected mentor changes
  useEffect(() => {
    const fetchProfileImageUrl = async () => {
      if (
        selectedMentor &&
        selectedMentor.mentordetsimagepath &&
        selectedMentor.mentordetsimagepath !== "" &&
        selectedMentor.mentordetsimagepath !== "null"
      ) {
        try {
          const response = await api.post(
            "/resources/generic/getfileurl",
            {
              userid: userid,
              incUserid: incuserid,
              url: selectedMentor.mentordetsimagepath,
            },
            {
              headers: {
                "X-Module": "Mentor Profile",
                "X-Action": "Profile Picture View",
              },
            },
          );

          if (response.data.statusCode === 200 && response.data.data) {
            setProfileImageUrl(response.data.data);
          } else {
            setProfileImageUrl(null);
          }
        } catch (error) {
          console.error("Error fetching profile image URL:", error);
          setProfileImageUrl(null);
        }
      } else {
        setProfileImageUrl(null);
      }
    };

    fetchProfileImageUrl();
  }, [selectedMentor, userid, incuserid]);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate gradient colors based on ID
  const getGradientColor = (id) => {
    const colors = [
      "gradient-blue",
      "gradient-purple",
      "gradient-emerald",
      "gradient-orange",
      "gradient-pink",
      "gradient-teal",
    ];
    return colors[id % colors.length];
  };

  const filteredMentors = mentors.filter(
    (mentor) =>
      mentor.mentordetsname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.mentordetsdomain.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEditMentor = () => {
    setIsEditModalOpen(true);
  };

  // Convert file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/png;base64, or data:image/jpeg;base64, prefix
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle profile picture upload
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Please upload a PNG or JPEG image",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Image size should be less than 5MB",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      // Show loading alert
      Swal.fire({
        title: "Uploading...",
        text: "Please wait while we upload your profile picture",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Convert to base64
      const base64String = await convertToBase64(file);
      const fileType = file.type.split("/")[1]; // 'png' or 'jpeg'

      // Call API
      const response = await api.post(
        "/resources/generic/mentoraddprofilepicture",
        {
          mentorId: selectedMentor.mentordetsid,
          userId: userid,
          fileBase64: base64String,
          fileType: fileType,
        },
        {
          headers: {
            userid: userid,
          },
        },
      );

      if (response.data.statusCode === 200) {
        // Get the file path from response
        const filePath = response.data.data;

        // Update the mentor's image path in local state
        setMentors((prevMentors) =>
          prevMentors.map((mentor) =>
            mentor.mentordetsid === selectedMentor.mentordetsid
              ? { ...mentor, mentordetsimagepath: filePath }
              : mentor,
          ),
        );

        setSelectedMentor((prev) => ({
          ...prev,
          mentordetsimagepath: filePath,
        }));

        // Fetch the actual URL for the uploaded image
        const urlResponse = await api.post(
          "/resources/generic/getfileurl",
          {
            userid: userid,
            incUserid: incuserid,
            url: filePath,
          },
          {
            headers: {
              "X-Module": "Mentor Profile",
              "X-Action": "Profile Picture View",
            },
          },
        );

        if (urlResponse.data.statusCode === 200 && urlResponse.data.data) {
          setProfileImageUrl(urlResponse.data.data);
        }

        // Show success message
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Profile picture updated successfully",
          confirmButtonColor: "#2563eb",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text: response.data.message || "Failed to upload profile picture",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        text: err.response?.data?.message || "Error uploading profile picture",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setUploadingImage(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleUpdateMentor = async (updatedMentor) => {
    try {
      setUpdatingMentor(true);

      const response = await api.post(
        "/updateMentor",
        {
          mentordetsid: updatedMentor.mentordetsid,
          mentordetsincubatorid: updatedMentor.mentordetsincubatorid,
          mentordetsmnttypeid: updatedMentor.mentordetsmnttypeid,
          mentordetsname: updatedMentor.mentordetsname,
          mentordetsdesign: updatedMentor.mentordetsdesign,
          mentordetsphone: updatedMentor.mentordetsphone,
          mentordetsaddress: updatedMentor.mentordetsaddress,
          mentordetsemail: updatedMentor.mentordetsemail,
          mentordetsdomain: updatedMentor.mentordetsdomain,
          mentordetspastexp: updatedMentor.mentordetspastexp,
          mentordetslinkedin: updatedMentor.mentordetslinkedin,
          mentordetswebsite: updatedMentor.mentordetswebsite,
          mentordetsblog: updatedMentor.mentordetsblog,
          mentordetsimagepath: updatedMentor.mentordetsimagepath,
          mentordetstimecommitment: updatedMentor.mentordetstimecommitment,
          mentordetsprevstupmentor: updatedMentor.mentordetsprevstupmentor,
          mentordetscomment: updatedMentor.mentordetscomment,
          mentordetsadminstate: updatedMentor.mentordetsadminstate,
          mentordetsmodifiedby: userid,
        },
        {
          headers: {
            userid: userid,
          },
        },
      );

      if (response.data.statusCode === 200) {
        // Update the mentor in the local state
        setMentors((prevMentors) =>
          prevMentors.map((mentor) =>
            mentor.mentordetsid === updatedMentor.mentordetsid
              ? { ...mentor, ...updatedMentor }
              : mentor,
          ),
        );

        // Update the selected mentor if it's the one being edited
        if (selectedMentor.mentordetsid === updatedMentor.mentordetsid) {
          setSelectedMentor({ ...selectedMentor, ...updatedMentor });
        }

        setIsEditModalOpen(false);

        // Show success message
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Mentor details updated successfully",
          confirmButtonColor: "#2563eb",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: response.data.message || "Failed to update mentor",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Update Error",
        text: err.response?.data?.message || "Error updating mentor",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setUpdatingMentor(false);
    }
  };

  // Shimmer loading component
  const ShimmerLoader = () => (
    <div className="dashboard-container">
      {/* Header Shimmer */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="shimmer h-8 w-64 mb-2"></div>
            <div className="shimmer h-4 w-80"></div>
          </div>
          <div className="header-stats">
            <div className="shimmer stat-card h-20 w-24"></div>
            <div className="shimmer stat-card h-20 w-24"></div>
          </div>
        </div>
      </header>

      {/* Main Content Shimmer */}
      <div className="main-content">
        <div className="content-grid">
          {/* Left Sidebar - Mentor List Shimmer */}
          <div className="sidebar">
            {/* Search Box Shimmer */}
            <div className="search-container">
              <div className="shimmer h-10 w-full rounded-lg"></div>
            </div>

            {/* Mentor Cards List Shimmer */}
            <div className="mentor-list">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="mentor-card">
                  <div className="mentor-card-content">
                    <div className="shimmer mentor-avatar"></div>
                    <div className="mentor-info">
                      <div className="shimmer h-5 w-40 mb-2"></div>
                      <div className="shimmer h-4 w-32 mb-2"></div>
                      <div className="flex gap-2">
                        <div className="shimmer h-5 w-16 rounded-full"></div>
                        <div className="shimmer h-5 w-16 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Selected Mentor Details Shimmer */}
          <div className="details-section">
            {/* Mentor Profile Header Shimmer */}
            <div className="profile-header">
              <div className="shimmer profile-banner"></div>
              <div className="profile-content">
                <div className="profile-main">
                  <div className="shimmer profile-avatar"></div>
                  <div className="profile-text">
                    <div className="shimmer h-8 w-64 mb-2"></div>
                    <div className="shimmer h-5 w-48 mb-3"></div>
                    <div className="flex gap-2">
                      <div className="shimmer h-6 w-20 rounded-full"></div>
                      <div className="shimmer h-6 w-20 rounded-full"></div>
                      <div className="shimmer h-6 w-20 rounded-full"></div>
                    </div>
                  </div>
                  <div className="shimmer h-10 w-32 rounded-lg"></div>
                </div>
              </div>
            </div>

            {/* Contact and Online Presence Shimmer */}
            <div className="info-grid">
              {/* Contact Information Shimmer */}
              <div className="info-card">
                <div className="shimmer h-6 w-40 mb-4"></div>
                <div className="info-list">
                  <div className="info-item">
                    <div className="shimmer info-icon"></div>
                    <div className="info-details">
                      <div className="shimmer h-3 w-12 mb-1"></div>
                      <div className="shimmer h-4 w-full"></div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="shimmer info-icon"></div>
                    <div className="info-details">
                      <div className="shimmer h-3 w-12 mb-1"></div>
                      <div className="shimmer h-4 w-full"></div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="shimmer info-icon"></div>
                    <div className="info-details">
                      <div className="shimmer h-3 w-12 mb-1"></div>
                      <div className="shimmer h-4 w-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Online Presence Shimmer */}
              <div className="info-card">
                <div className="shimmer h-6 w-40 mb-4"></div>
                <div className="info-list">
                  <div className="shimmer h-14 w-full rounded-lg mb-3"></div>
                  <div className="shimmer h-14 w-full rounded-lg mb-3"></div>
                  <div className="shimmer h-14 w-full rounded-lg"></div>
                </div>
              </div>
            </div>

            {/* Professional Details Shimmer */}
            <div className="professional-section">
              <div className="shimmer h-6 w-48 mb-4"></div>
              <div className="professional-grid">
                <div className="shimmer detail-box h-24"></div>
                <div className="shimmer detail-box h-24"></div>
                <div className="shimmer detail-box h-24"></div>
                <div className="shimmer detail-box h-24"></div>
              </div>
            </div>

            {/* Record Information Shimmer */}
            <div className="record-section">
              <div className="shimmer h-6 w-48 mb-4"></div>
              <div className="record-grid">
                <div className="record-box">
                  <div className="shimmer h-3 w-20 mb-2"></div>
                  <div className="shimmer h-4 w-32 mb-1"></div>
                  <div className="shimmer h-3 w-24"></div>
                </div>
                <div className="record-box">
                  <div className="shimmer h-3 w-24 mb-2"></div>
                  <div className="shimmer h-4 w-32 mb-1"></div>
                  <div className="shimmer h-3 w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ShimmerLoader />;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}

      {/* Main Content */}
      <div className="main-content">
        <div>
          {/* Left Sidebar - Mentor List */}

          {/* Right Content - Selected Mentor Details */}
          <div className="details-section">
            {selectedMentor && (
              <>
                {/* Mentor Profile Header */}
                <div className="profile-header">
                  <div
                    className={`profile-banner ${
                      selectedMentor.mentordetsid % 2 === 0
                        ? "banner-blue"
                        : "banner-green"
                    }`}
                  ></div>

                  <div className="profile-content">
                    <div className="profile-main">
                      <div className="profile-avatar-wrapper">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt={selectedMentor.mentordetsname}
                            className="profile-avatar-image"
                            onError={(e) => {
                              // If image fails to load, hide img and show initials
                              e.target.style.display = "none";
                              const initialsDiv = e.target.nextElementSibling;
                              if (initialsDiv) {
                                initialsDiv.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`profile-avatar ${getGradientColor(
                            selectedMentor.mentordetsid,
                          )}`}
                          style={{
                            display: profileImageUrl ? "none" : "flex",
                          }}
                        >
                          {getInitials(selectedMentor.mentordetsname)}
                        </div>

                        {/* Camera Icon for Upload */}
                        <button
                          className="profile-camera-btn"
                          onClick={handleProfilePictureClick}
                          disabled={uploadingImage}
                          title="Change profile picture"
                        >
                          {uploadingImage ? (
                            <span className="camera-loading">⏳</span>
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </button>

                        {/* Hidden File Input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                        />
                      </div>

                      <div className="profile-text">
                        <h2 className="profile-name">
                          {selectedMentor.mentordetsname}
                        </h2>
                        {/* <p className="profile-designation">
                          {selectedMentor.mentordetsdesign}
                        </p> */}
                        {/* Only show badges if at least one exists */}
                        {(selectedMentor.mentorclasssetname ||
                          selectedMentor.mentortypename ||
                          selectedMentor.mentordetsdomain) && (
                          <div className="profile-badges">
                            {selectedMentor.mentorclasssetname && (
                              <span className="badge badge-blue">
                                {selectedMentor.mentorclasssetname}
                              </span>
                            )}
                            {selectedMentor.mentortypename && (
                              <span className="badge badge-purple">
                                {selectedMentor.mentortypename}
                              </span>
                            )}
                            {selectedMentor.mentordetsdomain && (
                              <span className="badge badge-green">
                                {selectedMentor.mentordetsdomain}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* <button
                        className="edit-profile-btn"
                        onClick={handleEditMentor}
                      >
                        <CircleFadingPlus className="w-4 h-4" />
                        Edit Profile
                      </button> */}
                    </div>
                  </div>
                </div>

                {/* Contact and Online Presence */}
                <div className="info-grid">
                  {/* Contact Information */}
                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="icon">✉️</span>
                      Contact Information
                    </h3>

                    <div className="info-list">
                      {selectedMentor.mentordetsemail && (
                        <div className="info-item">
                          <div className="info-icon icon-blue">✉️</div>
                          <div className="info-details">
                            <p className="info-label">Email</p>
                            <p className="info-value">
                              {selectedMentor.mentordetsemail}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedMentor.mentordetsphone && (
                        <div className="info-item">
                          <div className="info-icon icon-green">📞</div>
                          <div className="info-details">
                            <p className="info-label">Phone</p>
                            <p className="info-value">
                              {selectedMentor.mentordetsphone}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedMentor.mentordetsaddress && (
                        <div className="info-item">
                          <div className="info-icon icon-orange">📍</div>
                          <div className="info-details">
                            <p className="info-label">Address</p>
                            <p className="info-value">
                              {selectedMentor.mentordetsaddress}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Online Presence - Only show if at least one link exists */}
                  {(selectedMentor.mentordetslinkedin ||
                    selectedMentor.mentordetswebsite ||
                    selectedMentor.mentordetsblog) && (
                    <div className="info-card">
                      <h3 className="info-title">
                        <span className="icon">🌐</span>
                        Online Presence
                      </h3>

                      <div className="info-list">
                        {selectedMentor.mentordetslinkedin && (
                          <a
                            href={
                              selectedMentor.mentordetslinkedin.startsWith(
                                "http",
                              )
                                ? selectedMentor.mentordetslinkedin
                                : `https://${selectedMentor.mentordetslinkedin}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-item link-blue"
                          >
                            <div className="link-icon">💼</div>
                            <div className="link-details">
                              <p className="link-label">LinkedIn</p>
                              <p className="link-text">View Profile</p>
                            </div>
                            <span className="link-arrow">→</span>
                          </a>
                        )}

                        {selectedMentor.mentordetswebsite && (
                          <a
                            href={
                              selectedMentor.mentordetswebsite.startsWith(
                                "http",
                              )
                                ? selectedMentor.mentordetswebsite
                                : `https://${selectedMentor.mentordetswebsite}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-item link-purple"
                          >
                            <div className="link-icon">🌐</div>
                            <div className="link-details">
                              <p className="link-label">Website</p>
                              <p className="link-text">Visit Website</p>
                            </div>
                            <span className="link-arrow">→</span>
                          </a>
                        )}

                        {selectedMentor.mentordetsblog && (
                          <a
                            href={
                              selectedMentor.mentordetsblog.startsWith("http")
                                ? selectedMentor.mentordetsblog
                                : `https://${selectedMentor.mentordetsblog}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-item link-green"
                          >
                            <div className="link-icon">📚</div>
                            <div className="link-details">
                              <p className="link-label">Blog</p>
                              <p className="link-text">Read Articles</p>
                            </div>
                            <span className="link-arrow">→</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Professional Details */}
                <div className="professional-section">
                  <h3 className="section-title">
                    <span className="icon">💼</span>
                    Professional Details
                  </h3>

                  <div className="professional-grid">
                    {selectedMentor.mentordetspastexp && (
                      <div className="detail-box box-indigo">
                        <div className="detail-header">
                          <span className="detail-icon">🏆</span>
                          <p className="detail-label">Past Experience</p>
                        </div>
                        <div className="detail-text-container">
                          <p className="detail-text">
                            {selectedMentor.mentordetspastexp}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedMentor.mentordetstimecommitment && (
                      <div className="detail-box box-purple">
                        <div className="detail-header">
                          <span className="detail-icon">⏰</span>
                          <p className="detail-label">Time Commitment</p>
                        </div>
                        <div className="detail-text-container">
                          <p className="detail-text">
                            {selectedMentor.mentordetstimecommitment}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedMentor.mentordetsprevstupmentor && (
                      <div className="detail-box box-green">
                        <div className="detail-header">
                          <span className="detail-icon">📈</span>
                          <p className="detail-label">
                            Previous Startup Mentor
                          </p>
                        </div>
                        <div className="detail-text-container">
                          <p className="detail-text detail-bold">
                            {selectedMentor.mentordetsprevstupmentor}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedMentor.mentordetscomment && (
                      <div className="detail-box box-orange">
                        <div className="detail-header">
                          <span className="detail-icon">💬</span>
                          <p className="detail-label">Comments</p>
                        </div>
                        <div className="detail-text-container">
                          <p className="detail-text">
                            {selectedMentor.mentordetscomment}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Record Information */}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mentor Modal */}
      {isEditModalOpen && (
        <EditMentorModal
          mentor={selectedMentor}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateMentor}
          isUpdating={updatingMentor}
        />
      )}
    </div>
  );
};

export default MentorDashboard;
