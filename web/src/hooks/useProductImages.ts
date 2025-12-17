import { useState, useEffect } from 'react';

interface ProductImage {
  url: string;
  title?: string;
  caption?: string;
}

interface ProductImagesResponse {
  images: ProductImage[];
  count?: number;
  error?: string;
  message?: string;
}

export function useProductImages(vin?: string) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vin) {
      setImages([]);
      setError(null);
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/product-images?vin=${vin}`);
        const data: ProductImagesResponse = await response.json();

        if (data.error) {
          setError(data.error);
          setImages([]);
        } else {
          setImages(data.images || []);
        }
      } catch (err) {
        setError('Failed to fetch product images');
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [vin]);

  return { images, loading, error };
}
