import React, { useEffect } from "react";
import { useLocation, useRoute } from "wouter";

export default function DocEntryPage() {
  const [, params] = useRoute("/doc/:id");
  const docId = params?.id;
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (docId) {
      setLocation(`/doc/${docId}/review`);
    } else {
      setLocation("/");
    }
  }, [docId, setLocation]);

  return null;
}
