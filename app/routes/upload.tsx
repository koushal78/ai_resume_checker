import Navbar from "~/components/Navbar";
import {type FormEvent, useState} from "react";
import FileUploader from "../../FileUploader";
import {usePuterStore} from "~/lib/puter";
import {convertPdfToImage} from "../../pdf2img";
import {generateUUID} from "~/lib/utils";
import {AIResponseFormat, prepareInstructions} from "../../constants";

const upload =()=>{
    const{auth,isLoading,fs,ai,kv} = usePuterStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const[statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);


    const handleFileSelect =(file:File | null)=>{
        setFile(file)
    }
    const handleAnalyze = async({companyName,jobTitle,jobDescription,file}:{companyName:string,jobTitle:string,jobDescription:string,file:File})=>{
        setIsProcessing(true);
        setStatusText('Uploading the file ...');
        const uploadedFile = await fs.upload([file]);
        if(!uploadedFile)return setStatusText('Error:Failed to upload file');

        setStatusText("Converting to image...");
        const imageFile =  await convertPdfToImage(file);
        if(!imageFile.file)return setStatusText('Error:Failed to convert PDF to  image');


        setStatusText('Uploading the image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        if(!uploadedImage) return setStatusText('Error: Failed to upload image');


        setStatusText('Preparing data...');

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath:uploadedFile.path,
            imagePath:uploadedImage.path,
            companyName,jobTitle,jobDescription,
            feedback:'',
        }
        await kv.set(`resume:${uuid}`,JSON.stringify(data));

        setStatusText("Analyzing...");

        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({jobTitle,jobDescription,AIResponseFormat})

        )

        if(!feedback) return setStatusText('Error:Failed to analyze resume');
        const feedbackText = typeof feedback.message.content === 'string' ? feedback.message.content : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`,JSON.stringify(data));
        setStatusText('Analyzing complete ,redirecting...');
        console.log(data);
    }

    const handleSubmit =(e:FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        console.log(
        {companyName, jobTitle, jobDescription, file});

        if(!file) return;
        handleAnalyze({companyName,jobTitle,jobDescription,file});


    }
    return (
        <main className="bg-[url('public/public/images/bg-main.svg')] bg-cover">
            <Navbar/>
            <section className="main-section" >
                <div className={'page-heading py-16'}>
                    <h1>Smart feedback for your dream job</h1>
                    {
                        isProcessing ?(
                            <>
                                <h2>{statusText}</h2>
                                <img src ='public/public/images/resume-scan.gif' className={'w-full'}/>
                            </>
                        ):(
                            <h2>Drop your resume for the ATS score and improvement tips</h2>
                        )
                    }{
                        !isProcessing && (
                            <form id={'upload-from'} onSubmit={handleSubmit} className={'flex flex-col gap-4 mt-8'}>
                                <div className={'from-div'}>
                                    <label htmlFor={'company-name'}>Company Name</label>
                                    <input type='text' name={'company-name'} placeholder={"company Name"} id='company-name'/>


                                </div>
                                <div className={'from-div'}>
                                    <label htmlFor={'job-title'}>Job Title</label>
                                    <input type='text' name={'job-title'} placeholder={"Job Title"} id='job-title'/>


                                </div>
                                <div className={'from-div'}>
                                    <label htmlFor={'job-description'}>Job Description</label>
                                    <input type='text' name={'job-description'} placeholder={"Job Description"} id='job-description'/>


                                </div>
                                <div className={'from-div'}>
                                 <div>
                                    <label htmlFor={'uploader'}>Upload Resume</label>
                                     <FileUploader onFileSelect={handleFileSelect}/>
                                 </div>


                                </div>
                                <button className={'primary-button'} type={"submit"}>Analyze Resume</button>
                            </form>
                    )
                }
                </div>
            </section>
                </main>
    )
}

export default upload;