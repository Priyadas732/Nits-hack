import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import abi from "../utils/abi.json";

const CONTRACT_ADDRESS = "0xC8e4689704E74e62C59D7Fc20C74f7D0803157e9";

export default function RegisterIssuer() {
  const { address, isConnected } = useAccount();
  const [instituteName, setInstituteName] = useState("");
  const [status, setStatus] = useState("");
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const {
    data: hash,
    writeContract,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!instituteName.trim()) {
      alert("Please enter your institute name!");
      return;
    }

    setStatus("Submitting application...");

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: abi,
        functionName: "requestAuthorization",
        args: [instituteName.trim()],
        gas: 300000n, // Set reasonable gas limit below network cap
      });
    } catch (error) {
      console.error("Error submitting application:", error);

      // Provide user-friendly error messages
      let errorMessage = "";

      if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction was rejected.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees.";
      } else if (error.message?.includes("Already registered")) {
        errorMessage = "This address has already submitted an application.";
      } else {
        errorMessage = error.shortMessage || error.message || "Transaction failed";
      }

      setStatus(`Error: ${errorMessage}`);
    }
  };

  // Handle transaction confirmation
  if (isConfirmed && !applicationSubmitted) {
    setApplicationSubmitted(true);
    setStatus("");
    setInstituteName("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          padding: "2.5rem",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
            }}
          >
            🎓
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.5rem",
            }}
          >
            Register as Issuer
          </h1>
          <p
            style={{
              color: "#666",
              fontSize: "1rem",
            }}
          >
            Apply to become an authorized credential issuer
          </p>
        </div>

        {/* Success Message */}
        {applicationSubmitted && (
          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #667eea20, #764ba220)",
              border: "2px solid #667eea",
              borderRadius: "12px",
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
            <h3
              style={{
                color: "#667eea",
                fontWeight: "bold",
                fontSize: "1.25rem",
                marginBottom: "0.5rem",
              }}
            >
              Application Submitted Successfully!
            </h3>
            <p style={{ color: "#666", fontSize: "0.95rem" }}>
              Your application is pending admin approval. You'll be notified
              once your institute is authorized to issue credentials.
            </p>
            <p
              style={{
                color: "#999",
                fontSize: "0.85rem",
                marginTop: "1rem",
              }}
            >
              Transaction Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#667eea",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                {hash?.substring(0, 10)}...{hash?.substring(hash.length - 8)}
              </a>
            </p>
            <button
              onClick={() => setApplicationSubmitted(false)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1.5rem",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Submit Another Application
            </button>
          </div>
        )}

        {/* Form */}
        {!applicationSubmitted && (
          <>
            {/* Wallet Connection */}
            <div
              style={{
                marginBottom: "2rem",
                padding: "1.5rem",
                background: "#f8f9fa",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  marginBottom: "1rem",
                  color: "#666",
                  fontSize: "0.95rem",
                }}
              >
                {isConnected
                  ? "✅ Wallet Connected"
                  : "👛 Connect your wallet to continue"}
              </p>
              <ConnectButton />
            </div>

            {/* Application Form */}
            {isConnected && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    htmlFor="instituteName"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    Institute Name *
                  </label>
                  <input
                    type="text"
                    id="instituteName"
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="e.g., MIT, Harvard University, etc."
                    required
                    disabled={isSubmitting || isConfirming}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      fontSize: "1rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <p
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#999",
                    }}
                  >
                    This name will be displayed on all credentials you issue
                  </p>
                </div>

                {/* Status Message */}
                {status && (
                  <div
                    style={{
                      padding: "1rem",
                      marginBottom: "1rem",
                      background: status.includes("Error") ? "#fee" : "#fef",
                      border: `2px solid ${status.includes("Error") ? "#fcc" : "#fcf"
                        }`,
                      borderRadius: "8px",
                      color: status.includes("Error") ? "#c33" : "#933",
                      fontSize: "0.9rem",
                    }}
                  >
                    {status}
                  </div>
                )}

                {/* Submit Error */}
                {submitError && (
                  <div
                    style={{
                      padding: "1rem",
                      marginBottom: "1rem",
                      background: "#fee",
                      border: "2px solid #fcc",
                      borderRadius: "8px",
                      color: "#c33",
                      fontSize: "0.9rem",
                    }}
                  >
                    Error: {submitError.message}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting || isConfirming || !instituteName.trim()
                  }
                  style={{
                    width: "100%",
                    padding: "1rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "white",
                    background:
                      isSubmitting || isConfirming
                        ? "#ccc"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    borderRadius: "12px",
                    cursor:
                      isSubmitting || isConfirming || !instituteName.trim()
                        ? "not-allowed"
                        : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                  }}
                  onMouseEnter={(e) => {
                    if (
                      !isSubmitting &&
                      !isConfirming &&
                      instituteName.trim()
                    ) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0 6px 20px rgba(102, 126, 234, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(102, 126, 234, 0.4)";
                  }}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : isConfirming
                      ? "Confirming..."
                      : "📝 Submit Application"}
                </button>

                {/* Info Box */}
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    background: "#f0f4ff",
                    borderRadius: "8px",
                    border: "1px solid #d0d9ff",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#555",
                      margin: 0,
                      lineHeight: "1.6",
                    }}
                  >
                    <strong>ℹ️ Note:</strong> After submission, your application
                    will be reviewed by the platform administrator. You'll
                    receive authorization to issue credentials once approved.
                    This typically takes 1-2 business days.
                  </p>
                </div>
              </form>
            )}
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#999" }}>
            Already registered?{" "}
            <a
              href="/"
              style={{
                color: "#667eea",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Go to Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
