import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

// Define the form data interface
interface FormData {
  name: string;
  email: string;
  story: string;
  images?: UploadedImage[];
}

// Define the interface for uploaded images
interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  variants: {
    public: string;
    thumbnail?: string;
  };
}

const StoryCollectionApp = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  // const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<FormData>();

  // Sanitize text input
  const sanitizeText = (text: string): string => {
    return text
      .replace(/[<>]/g, '') // Remove basic HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const uploadPromises = imageFiles.map(file => uploadImageToCloudflare(file));
        const uploadedImageResults = await Promise.all(uploadPromises);
        
        const successfulUploads = uploadedImageResults.filter(result => result !== null) as UploadedImage[];
        
        setUploadedImages(prev => [...prev, ...successfulUploads]);
        setValue('images', [...uploadedImages, ...successfulUploads]);
      } catch (error) {
        console.error('Error uploading images:', error);
        setSubmitMessage('Error uploading images. Please try again.');
      } finally {
        setUploadingImages(false);
      }
    }
  };

  const uploadImageToCloudflare = async (file: File): Promise<UploadedImage | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('https://story-collection-worker.workers.dev/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      if (result.success) {
        return result.image;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setValue('images', newImages);
  };

  // const convertToBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => resolve(reader.result);
  //     reader.onerror = error => reject(error);
  //   });
  // };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Sanitize text inputs
      const sanitizedData = {
        name: sanitizeText(data.name),
        email: data.email.trim().toLowerCase(),
        story: sanitizeText(data.story),
      };

      // Submit to Cloudflare Worker with image references
      const response = await fetch('https://story-collection-worker.workers.dev/submit-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sanitizedData,
          images: uploadedImages,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      await response.json(); // Process the response but don't store it
      setSubmitMessage('Story submitted successfully! Thank you for sharing.');
      reset();
      setUploadedImages([]);
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
        href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css"
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
                <form onSubmit={handleSubmit(onSubmit)}>
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
                        rows={8}
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
                        onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          setDragActive(false);
                        }}
                        onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => {
                          const fileInput = document.getElementById('file-input') as HTMLInputElement;
                          fileInput?.click();
                        }}
                      >
                        <div className="content">
                          <p className="has-text-centered">
                            <i className={`fas fa-upload fa-2x ${uploadingImages ? 'fa-spin' : ''}`}></i>
                          </p>
                          <p className="has-text-centered">
                            <strong>{uploadingImages ? 'Uploading...' : 'Click to upload'}</strong> {!uploadingImages && 'or drag and drop images here'}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFiles(Array.from(e.target.files || []))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview uploaded images */}
                  {uploadedImages.length > 0 && (
                    <div className="field">
                      <label className="label">Uploaded Images:</label>
                      <div className="columns is-multiline">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="column is-one-quarter">
                            <div className="card">
                              <div className="card-image">
                                <figure className="image is-4by3">
                                  <img 
                                    src={image.variants.thumbnail || image.variants.public} 
                                    alt={image.filename}
                                    style={{ objectFit: 'cover' }}
                                  />
                                </figure>
                              </div>
                              <div className="card-content">
                                <p className="is-size-7 has-text-centered">
                                  {image.filename}
                                </p>
                                <div className="has-text-centered">
                                  <button
                                    type="button"
                                    className="button is-danger is-small"
                                    onClick={() => removeImage(index)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="field">
                    <div className="control">
                      <button
                        type="submit"
                        className={`button is-primary is-large is-fullwidth ${isSubmitting || uploadingImages ? 'is-loading' : ''}`}
                        disabled={isSubmitting || uploadingImages}
                      >
                        {isSubmitting ? 'Submitting...' : uploadingImages ? 'Uploading Images...' : 'Submit Story'}
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
                </form>
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