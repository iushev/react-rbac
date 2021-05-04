import { useContext, useEffect, useRef, useState } from "react";
import RbacContext, { CheckAccessOptions } from "./RbacContext";

function useCheckAccess({ roles, allow, params, match }: CheckAccessOptions) {
  const componentIsMounted = useRef(true);
  const rbac = useContext(RbacContext);

  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    return () => {
      componentIsMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setChecking(true);
    setHasAccess(false);

    rbac
      .checkAccess({ roles, allow, params, match })
      .then((result) => {
        if (componentIsMounted.current) {
          setChecking(false);
          setHasAccess(result);
        }
      })
      .catch((err) => {
        if (componentIsMounted.current) {
          setChecking(false);
          setHasAccess(false);
        }
      });
  }, [rbac, roles, allow, params, match]);

  return {
    checking,
    hasAccess,
  };
}

export default useCheckAccess;
