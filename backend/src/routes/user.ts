import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import { signinInput, signupInput } from "@sayhii/medium-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET_KEY: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      msg: "Inputs are not correct!",
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
      },
    });

    const token = await sign({ id: user.id }, c.env.JWT_SECRET_KEY);
    return c.json({
      msg: "You are register successfully !!",
      jwt: token,
    });
  } catch (e) {
    c.status(403);
    return c.json({
      error: "Error while signing up!!",
    });
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      msg: "Inputs are not correct!",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        username: body.username,
        password: body.password,
      },
    });

    if (!user) {
      c.status(403);
      return c.json({
        msg: "User doesn't exist !!",
      });
    }

    const token = await sign({ id: user.id }, c.env.JWT_SECRET_KEY);
    return c.json({
      msg: "You are successfully log in !!",
      jwt: token,
    });
  } catch (e) {
    c.status(403);
    return c.json({
      error: "Error while signin !!",
    });
  }
});
