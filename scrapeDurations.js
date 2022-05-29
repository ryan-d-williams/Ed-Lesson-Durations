const options = {
    headers: new Headers({ 'content-type': 'application/json', "x-token": localStorage.authToken })
};

let course_number_match = /courses\/([0-9]*)\//g;
let course_number = course_number_match.exec(window.location.href)[1];
let duration_data = [];

let lessons_data = await(await fetch(`https://us.edstem.org/api/courses/${course_number}/lessons`, options)).json();
let lessons = lessons_data.lessons;
lessons.sort((l1, l2) => l1.index < l2.index ? -1 : 1);
await Promise.all(lessons.map(async (lesson, ndx) => {
    let lesson_title = lesson.title;
    let lesson_id = lesson.id;
    let lesson_url = `https://us.edstem.org/api/lessons/${lesson_id}?view=1`;

    let slides = await getSlides(lesson_url);
    let num_slides = slides.length;
    let total_duration = 0, quiz_count = 0, youtube_link_count = 0;

    await Promise.all(slides.map(async (slide) => {
        if (slide.video_url) {
            let video_url = slide.video_url;

            let entry_id_match = /entry_id=([^&]*)/g;
            let entry_id_res = entry_id_match.exec(video_url);
            if (entry_id_res?.length >= 1) {
                entry_id = entry_id_res[1];
                let stripped_url = video_url.substring(0, video_url.indexOf("embedIframeJs"));
                let duration_url = `${stripped_url}playManifest/entryId/${entry_id}`;

                let duration = await getDuration(duration_url);
                total_duration += duration;
            } else {
                youtube_link_count++;
            }
        } else if (slide.type === "quiz") {
            quiz_count++;
        }
    }));

    let total_minutes = Math.floor(total_duration / 60);
    duration_data.push({
        title: lesson_title,
        num_slides: num_slides,
        "duration (s)": total_duration,
        "duration": `${total_minutes} minutes ${total_duration - total_minutes * 60} seconds`,
        num_quiz: quiz_count,
        "YouTube Videos (not included in duration)": youtube_link_count,
        ndx: ndx
    });
}));

duration_data.sort((l1, l2) => l1.ndx < l2.ndx ? -1 : 1);
console.table(duration_data);

async function getSlides(lesson_url) {
    let lesson_data = await (await fetch(lesson_url, options)).json();
    return lesson_data.lesson.slides;
}

async function getDuration(url) {
    let duration_data = await (await fetch(url)).text();
    let duration_match = /<duration>(.*?)<\/duration>/g;
    let duration = parseInt(duration_match.exec(duration_data)[1]);
    return duration;
}
