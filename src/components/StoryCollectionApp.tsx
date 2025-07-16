import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const StoryCollectionApp = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  // Sanitize text input
  const sanitizeText = (text) => {
    return text
      .replace(/[<>]/g, '') // Remove basic HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...imageFiles]);
      setValue('images', [...uploadedFiles, ...imageFiles]);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setValue('images', newFiles);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Sanitize text inputs
      const sanitizedData = {
        name: sanitizeText(data.name),
        email: data.email.trim().toLowerCase(),
        story: sanitizeText(data.story),
      };

      // Convert images to base64 for Netlify Functions
      let imageData = [];
      if (uploadedFiles.length > 0) {
        const base64Promises = uploadedFiles.map(async (file) => {
          const base64 = await convertToBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          };
        });
        imageData = await Promise.all(base64Promises);
      }

      // Submit to Netlify Function
      const response = await fetch('/.netlify/functions/submit-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sanitizedData,
          images: imageData,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();
      setSubmitMessage('Story submitted successfully! Thank you for sharing.');
      reset();
      setUploadedFiles([]);
    } catch (error) {
      setSubmitMessage('Error submitting story. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Include Bulma CSS */}
      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css"
      />
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      />
      
      <section className="hero is-primary">
        <div className="hero-body">
          <div className="container has-text-centered">
            <h1 className="title is-1">Peter Martin Stories</h1>
            <h2 className="subtitle">Share your story with us</h2>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-8">
              <div className="box">
                <div>
                  {/* Name Field */}
                  <div className="field">
                    <label className="label">Name *</label>
                    <div className="control">
                      <input
                        className={`input ${errors.name ? 'is-danger' : ''}`}
                        type="text"
                        placeholder="Your full name"
                        {...register('name', {
                          required: 'Name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          },
                          maxLength: {
                            value: 100,
                            message: 'Name must be less than 100 characters'
                          }
                        })}
                      />
                    </div>
                    {errors.name && (
                      <p className="help is-danger">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="field">
                    <label className="label">Email *</label>
                    <div className="control">
                      <input
                        className={`input ${errors.email ? 'is-danger' : ''}`}
                        type="email"
                        placeholder="your.email@example.com"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address'
                          }
                        })}
                      />
                    </div>
                    {errors.email && (
                      <p className="help is-danger">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Story Field */}
                  <div className="field">
                    <label className="label">Your Story *</label>
                    <div className="control">
                      <textarea
                        className={`textarea ${errors.story ? 'is-danger' : ''}`}
                        placeholder="Tell us your story..."
                        rows="8"
                        {...register('story', {
                          required: 'Story is required',
                          minLength: {
                            value: 10,
                            message: 'Story must be at least 10 characters'
                          },
                          maxLength: {
                            value: 5000,
                            message: 'Story must be less than 5000 characters'
                          }
                        })}
                      />
                    </div>
                    {errors.story && (
                      <p className="help is-danger">{errors.story.message}</p>
                    )}
                  </div>

                  {/* Image Upload Field */}
                  <div className="field">
                    <label className="label">Images (Optional)</label>
                    <div className="control">
                      <div
                        className={`box has-background-light ${dragActive ? 'has-background-primary-light' : ''}`}
                        style={{
                          border: dragActive ? '2px dashed #3273dc' : '2px dashed #dbdbdb',
                          padding: '2rem',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input').click()}
                      >
                        <div className="content">
                          <p className="has-text-centered">
                            <i className="fas fa-upload fa-2x"></i>
                          </p>
                          <p className="has-text-centered">
                            <strong>Click to upload</strong> or drag and drop images here
                          </p>
                          <p className="has-text-centered is-size-7">
                            Supported formats: JPG, PNG, GIF. Max 5MB per image.
                          </p>
                        </div>
                        <input
                          id="file-input"
                          type="file"
                          multiple
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFiles(Array.from(e.target.files))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="field">
                      <label className="label">Selected Images:</label>
                      <div className="tags">
                        {uploadedFiles.map((file, index) => (
                          <span key={index} className="tag is-info">
                            <i className="fas fa-image mr-1"></i>
                            {file.name}
                            <button
                              type="button"
                              className="delete is-small ml-1"
                              onClick={() => removeFile(index)}
                            ></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="field">
                    <div className="control">
                      <button
                        type="button"
                        className={`button is-primary is-large is-fullwidth ${isSubmitting ? 'is-loading' : ''}`}
                        disabled={isSubmitting}
                        onClick={handleSubmit(onSubmit)}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Story'}
                      </button>
                    </div>
                  </div>

                  {/* Success/Error Message */}
                  {submitMessage && (
                    <div className={`notification ${submitMessage.includes('Error') ? 'is-danger' : 'is-success'}`}>
                      <button 
                        className="delete" 
                        onClick={() => setSubmitMessage('')}
                      ></button>
                      {submitMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="content has-text-centered">
          <p>
            <strong>Peter Martin Stories</strong> - Collecting and preserving stories that matter.
          </p>
          <p className="is-size-7">
            Built with React and hosted on Netlify
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StoryCollectionApp;