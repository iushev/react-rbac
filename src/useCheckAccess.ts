import { useEffect, useState } from "react";
import { CheckAccessOptions, useRbac } from "./RbacContext";

export type CheckAssessState = {
  checking: boolean;
  hasAccess: boolean;
};

function useCheckAccess({ roles, allow, params, match }: CheckAccessOptions) {
  const rbac = useRbac();

  const [state, setState] = useState<CheckAssessState>({
    checking: true,
    hasAccess: false,
  });

  useEffect(() => {
    let subscribed = true;

    const checkAccess = async () => {
      setState({
        checking: true,
        hasAccess: false,
      });

      try {
        const result = await rbac.checkAccess({ roles, allow, params, match });
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: result,
          });
        }
      } catch (err) {
        console.error(err);
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: false,
          });
        }
      }
    };

    checkAccess();

    return () => {
      subscribed = false;
    };
  }, [rbac, roles, allow, params, match]);

  return state;
}

export default useCheckAccess;
