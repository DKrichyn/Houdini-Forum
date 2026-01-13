import React from "react";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <div className="nf" role="region" aria-label="Page not found">
      <video className="nf__video" autoPlay muted loop playsInline>
        <source src="/videos/404_1.mp4" type="video/mp4" />
      </video>

      <div className="nf__overlay" />

      <div className="nf__content">
        <div className="nf__box" role="group" aria-label="404 message">
          <h1 className="nf__code" aria-label="404">
            404
          </h1>
          <p className="nf__title">Page not found</p>
          <p className="nf__desc">
            The page you’re looking for doesn’t exist or was moved.
          </p>
          <a className="nf__btn" href="/" aria-label="Go to Home">
            <span>Go Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}
