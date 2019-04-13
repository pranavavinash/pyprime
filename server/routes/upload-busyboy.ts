import { Request, Response, Router } from "express";

const uploadRouter: Router = Router();

uploadRouter.post("/", (req: Request, res: Response) => {
  req.busboy.on('file', function(fieldname, file, filename) {
    console.log('on:file');
  });

  req.busboy.on('field', function(fieldname, value, valTruncated, keyTruncated) {
    console.log('on:field');
  });

  req.busboy.once('end', function() {
    console.log('once:end');
    res.send('done');
  });
  req.pipe(req.busboy);
});

export { uploadRouter };
