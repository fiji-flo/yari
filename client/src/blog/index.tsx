import { Route, Routes } from "react-router-dom";
import { HydrationData } from "../../../libs/types/hydration";
import { BlogPost } from "./post";

export function Blog(appProps: HydrationData) {
  return (
    <Routes>
      <Route path="/" element={<BlogIndex {...appProps} />} />
      <Route path="/:slug" element={<BlogPost {...appProps} />} />
    </Routes>
  );
}

function BlogIndex(porps: HydrationData) {
  return <article></article>;
}
