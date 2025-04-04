import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@sayhii/medium-common";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET_KEY: string;
  };
  Variables: {
    userId: string;
  };
}>();

type JwtPayload = {
  id: string;
};

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("authorization") || "";
  const token = header.split(" ")[1];

  try {
    const user = (await verify(token, c.env.JWT_SECRET_KEY)) as JwtPayload;

    if (user) {
      c.set("userId", user.id);
      await next();
    } else {
      c.status(403);
      return c.json({ error: "Unauthorized user!!" });
    }
  } catch (e) {
    c.status(403);
    return c.json({
      msg: "You are not authenticated !!",
    });
  }
});

blogRouter.post("/create", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const authorId = c.get("userId");
  const { success } = createBlogInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      msg: "Inputs are not correct!",
    });
  }

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: authorId,
    },
  });

  return c.json({
    msg: "Blog post created successfully!!",
    id: blog.id,
  });
});

blogRouter.put("/update", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const authorId = c.get("userId");
  const { success } = updateBlogInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      msg: "Inputs are not correct!",
    });
  }

  const blog = await prisma.post.update({
    where: {
      id: body.id,
      authorId: authorId,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    msg: "Blog post updated successfully!!",
    id: blog.id,
  });
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.findMany();

  return c.json({
    msg: "All Blog post received successfully!!",
    Blogs: blog,
  });
});

blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const id = c.req.param("id");

  try {
    const blog = await prisma.post.findUnique({
      where: {
        id: id,
      },
    });

    return c.json({
      msg: "Blog post fetched successfully !!",
      Blog: blog,
    });
  } catch (e) {
    c.status(411);
    return c.json({
      Error: "Error while fetching blog post !!",
    });
  }
});
