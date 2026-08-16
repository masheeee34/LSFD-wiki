'use client';

import React, { useState } from 'react';
import type { MediaItem } from '@/types';

interface MediaGalleryProps {
  media: MediaItem[];
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ media }) => {
  const [lightboxImage, setLightboxImage] = useState<MediaItem | null>(null);

  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');

  const renderVideo = (item: MediaItem) => {
    const url = item.url;
    let videoId = '';
    let embedUrl = '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      videoId = match ? match[1] : '';
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
      videoId = match ? match[1] : '';
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    return (
      <div
        key={item.id}
        style={{
          marginBottom: '12px',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        <div
          style={{
            aspectRatio: '16/9',
            backgroundColor: '#000',
          }}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.caption || 'Video'}
            />
          ) : (
            <video
              src={url}
              controls
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              title={item.caption || 'Video'}
            />
          )}
        </div>
        {item.caption && (
          <div
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-surface)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {item.caption}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {images.map((img) => (
            <figure
              key={img.id}
              onClick={() => setLightboxImage(img)}
              style={{
                margin: 0,
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)',
              }}
              className="gallery-fig"
            >
              <img
                src={img.url}
                alt={img.caption || 'Fiche médicale image'}
                style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
              />
              {img.caption && (
                <figcaption
                  style={{
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    borderTop: '1px solid var(--color-border-subtle)',
                  }}
                >
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {videos.length > 0 && <div>{videos.map(renderVideo)}</div>}

      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '28px',
              cursor: 'pointer',
              zIndex: 1001,
            }}
          >
            &times;
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.caption || 'Enlarged view'}
            style={{
              maxWidth: '90%',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxImage.caption && (
            <div
              style={{
                marginTop: '12px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                maxWidth: '80%',
                textAlign: 'center',
              }}
            >
              {lightboxImage.caption}
            </div>
          )}
        </div>
      )}

      <style>{`
        .gallery-fig:hover {
          border-color: var(--color-border-hover) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default MediaGallery;
