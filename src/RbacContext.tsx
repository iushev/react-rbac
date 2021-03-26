import React from "react";

const RbacContext = React.createContext({});

export const RbacProvider: React.FC = ({ children }) => {
  return <RbacContext.Provider value={{}}>children</RbacContext.Provider>;
};

export const RbacConsumer = RbacContext.Consumer;
export default RbacContext;
