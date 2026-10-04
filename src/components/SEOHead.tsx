import React, { useEffect } from 'react';
import { updateSEO, SEOProps } from '../utils/seo';

export const SEOHead: React.FC<SEOProps> = (props) => {
  useEffect(() => {
    updateSEO(props);
  }, [
    props.title,
    props.description,
    props.canonicalUrl,
    props.ogImage,
    props.job?.id,
    props.company?.id,
  ]);

  return null;
};
